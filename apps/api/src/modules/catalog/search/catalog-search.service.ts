import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AttributeValueKind, Prisma } from '@prisma/client';
import { OpenSearchService } from '../../../infra/opensearch/opensearch.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { serializeMeasures } from '../attributes/product-measures';

const INDEX = 'catalog_products';

export type AppliedSearchFilter = {
	attributeId: string;
	attributeName: string;
	valueId: string;
	value: string;
	rollupValue?: string;
	source: 'auto' | 'manual';
};

type FacetBucket = {
	attributeId: string;
	attributeName: string;
	buckets: Array<{ valueId: string; value: string; count: number }>;
};

const productSearchInclude = {
	vendor: true,
	category: true,
	attributeValues: {
		include: {
			attributeValue: {
				include: {
					attribute: true,
					parent: true,
				},
			},
		},
	},
	scalarValues: {
		include: { attribute: true },
	},
	offerings: { include: { uom: true } },
} satisfies Prisma.CatalogProductInclude;

@Injectable()
export class CatalogSearchService implements OnModuleInit {
	private readonly logger = new Logger(CatalogSearchService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly openSearch: OpenSearchService,
	) {}

	async onModuleInit() {
		try {
			await this.ensureIndex();
			const count = await this.openSearch.client.count({ index: INDEX });
			if((count.body?.count ?? 0) === 0) {
				await this.reindexAll();
			}
		}
		catch(error) {
			this.logger.warn(
				`OpenSearch catalog index not ready: ${error instanceof Error ? error.message : error}`,
			);
		}
	}

	async indexProduct(productId: string) {
		const product = await this.prisma.catalogProduct.findUnique({
			where: { id: productId },
			include: productSearchInclude,
		});
		if(!product || !product.active) {
			await this.deleteProduct(productId);
			return;
		}
		try {
			await this.ensureIndex();
			await this.openSearch.client.index({
				index: INDEX,
				id: product.id,
				body: this.toDocument(product),
				refresh: false,
			});
		}
		catch(error) {
			this.logger.warn(
				`Failed to index product ${productId}: ${error instanceof Error ? error.message : error}`,
			);
		}
	}

	async deleteProduct(productId: string) {
		try {
			await this.openSearch.client.delete({
				index: INDEX,
				id: productId,
			});
		}
		catch {
			return;
		}
	}

	async reindexAll() {
		const products = await this.prisma.catalogProduct.findMany({
			where: { active: true },
			include: productSearchInclude,
		});
		if(products.length === 0) {
			return;
		}
		const body = products.flatMap((product) => [
			{ index: { _index: INDEX, _id: product.id } },
			this.toDocument(product),
		]);
		await this.openSearch.client.bulk({ body, refresh: true });
		this.logger.log(`Indexed ${products.length} catalog products`);
	}

	async search(query: {
		q?: string;
		categorySlug?: string;
		vendorSlug?: string;
		limit?: number;
		rollupValueIds?: string[];
		omitValueIds?: string[];
	}) {
		const live = await this.openSearch.ping().catch(() => false);
		if(!live) {
			return this.prismaFallback(query);
		}

		const analysis = await this.analyzeQuery(query);
		const filters: Array<Record<string, unknown>> = [
			{ term: { active: true } },
		];
		if(query.categorySlug) {
			filters.push({ term: { categorySlug: query.categorySlug } });
		}
		if(query.vendorSlug) {
			filters.push({ term: { vendorSlug: query.vendorSlug } });
		}
		for(const applied of analysis.appliedFilters) {
			filters.push({
				nested: {
					path: 'attributes',
					query: {
						term: { 'attributes.rollupValueId': applied.valueId },
					},
				},
			});
		}

		const must: Array<Record<string, unknown>> = [];
		if(query.q?.trim()) {
			must.push({
				multi_match: {
					query: query.q.trim(),
					fields: ['title^3', 'description', 'skus^2', 'tags', 'attributeText'],
				},
			});
		}

		try {
			const response = await this.openSearch.client.search({
				index: INDEX,
				body: {
					size: query.limit ?? 50,
					query: {
						bool: {
							must: must.length > 0 ? must : [{ match_all: {} }],
							filter: filters,
						},
					},
					aggs: {
						attrs: {
							nested: { path: 'attributes' },
							aggs: {
								by_attr: {
									terms: { field: 'attributes.attributeId', size: 20 },
									aggs: {
										name: { terms: { field: 'attributes.attributeName', size: 1 } },
										rollups: {
											terms: { field: 'attributes.rollupValueId', size: 20 },
											aggs: {
												label: {
													terms: { field: 'attributes.rollupValue', size: 1 },
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});

			const hits = (response.body.hits?.hits ?? []) as Array<{ _id: string }>;
			const ids = hits.map((hit) => hit._id);
			const products = ids.length
				? await this.prisma.catalogProduct.findMany({
					where: { id: { in: ids }, active: true },
					include: {
						vendor: true,
						category: true,
						offerings: { include: { uom: true } },
					},
				})
				: [];
			const order = new Map(ids.map((id, index) => [id, index]));
			products.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));

			return {
				items: products,
				appliedFilters: analysis.appliedFilters,
				facets: this.readFacets(response.body.aggregations),
				source: 'opensearch' as const,
			};
		}
		catch(error) {
			this.logger.warn(
				`OpenSearch query failed: ${error instanceof Error ? error.message : error}`,
			);
			return this.prismaFallback(query);
		}
	}

	private async prismaFallback(query: {
		q?: string;
		categorySlug?: string;
		vendorSlug?: string;
		limit?: number;
	}) {
		const where: Prisma.CatalogProductWhereInput = { active: true };
		if(query.q) {
			where.OR = [
				{ title: { contains: query.q, mode: 'insensitive' } },
				{ description: { contains: query.q, mode: 'insensitive' } },
				{ offerings: { some: { sku: { contains: query.q, mode: 'insensitive' } } } },
			];
		}
		if(query.categorySlug) {
			where.category = { slug: query.categorySlug };
		}
		if(query.vendorSlug) {
			where.vendor = { slug: query.vendorSlug };
		}
		const items = await this.prisma.catalogProduct.findMany({
			where,
			include: {
				vendor: true,
				category: true,
				offerings: { include: { uom: true } },
			},
			orderBy: { title: 'asc' },
			take: query.limit ?? 50,
		});
		return {
			items,
			appliedFilters: [] as AppliedSearchFilter[],
			facets: [] as FacetBucket[],
			source: 'prisma' as const,
		};
	}

	private async analyzeQuery(query: {
		q?: string;
		categorySlug?: string;
		vendorSlug?: string;
		rollupValueIds?: string[];
		omitValueIds?: string[];
	}): Promise<{ appliedFilters: AppliedSearchFilter[] }> {
		const manual = query.rollupValueIds ?? [];
		const omit = new Set(query.omitValueIds ?? []);
		const applied: AppliedSearchFilter[] = [];

		if(manual.length > 0) {
			const rows = await this.prisma.attributeValue.findMany({
				where: { id: { in: manual } },
				include: { attribute: true, parent: true },
			});
			for(const row of rows) {
				applied.push({
					attributeId: row.attributeId,
					attributeName: row.attribute.name,
					valueId: row.parentId ?? row.id,
					value: row.value,
					rollupValue: row.parent?.value,
					source: 'manual',
				});
			}
		}

		const q = query.q?.trim().toLowerCase();
		if(!q) {
			return { appliedFilters: applied.filter((row) => !omit.has(row.valueId)) };
		}

		const tokens = q.split(/[^a-z0-9]+/i).filter((token) => token.length > 2);
		if(tokens.length === 0) {
			return { appliedFilters: applied.filter((row) => !omit.has(row.valueId)) };
		}

		const globals = await this.prisma.attributeValue.findMany({
			where: {
				vendorId: null,
				attribute: { valueKind: AttributeValueKind.OPTION, vendorId: null },
			},
			include: { attribute: true, parent: true },
		});

		let vendorValues: typeof globals = [];
		if(query.categorySlug || query.vendorSlug) {
			const category = query.categorySlug
				? await this.prisma.catalogCategory.findUnique({
					where: { slug: query.categorySlug },
				})
				: null;
			const vendor = query.vendorSlug
				? await this.prisma.vendor.findUnique({ where: { slug: query.vendorSlug } })
				: null;
			vendorValues = await this.prisma.attributeValue.findMany({
				where: {
					vendorId: vendor?.id ?? { not: null },
					...(category ? { categoryId: category.id } : {}),
					attribute: { valueKind: AttributeValueKind.OPTION },
				},
				include: { attribute: true, parent: true },
				take: 400,
			});
		}

		const dictionary = [...globals, ...vendorValues];
		for(const token of tokens) {
			const match = dictionary.find((row) => {
				const value = row.value.toLowerCase();
				const rollup = row.parent?.value.toLowerCase();
				return value === token || rollup === token;
			});
			if(!match) {
				continue;
			}
			const valueId = match.parentId ?? match.id;
			if(omit.has(valueId) || applied.some((row) => row.valueId === valueId)) {
				continue;
			}
			applied.push({
				attributeId: match.attributeId,
				attributeName: match.attribute.name,
				valueId,
				value: match.value,
				rollupValue: match.parent?.value,
				source: 'auto',
			});
		}

		return { appliedFilters: applied };
	}

	private async ensureIndex() {
		const exists = await this.openSearch.client.indices.exists({ index: INDEX });
		if(exists.body) {
			return;
		}
		await this.openSearch.client.indices.create({
			index: INDEX,
			body: {
				mappings: {
					properties: {
						active: { type: 'boolean' },
						title: { type: 'text' },
						description: { type: 'text' },
						skus: { type: 'keyword' },
						tags: { type: 'keyword' },
						vendorSlug: { type: 'keyword' },
						categorySlug: { type: 'keyword' },
						attributeText: { type: 'text' },
						weightNumeric: { type: 'double' },
						voltageNumeric: { type: 'double' },
						packageWeightNumeric: { type: 'double' },
						attributes: {
							type: 'nested',
							properties: {
								attributeId: { type: 'keyword' },
								attributeName: { type: 'keyword' },
								valueId: { type: 'keyword' },
								value: { type: 'keyword' },
								rollupValueId: { type: 'keyword' },
								rollupValue: { type: 'keyword' },
							},
						},
					},
				},
			},
		});
	}

	private toDocument(
		product: Prisma.CatalogProductGetPayload<{ include: typeof productSearchInclude }>,
	) {
		const measures = serializeMeasures(product as never);
		const attributes = product.attributeValues.map((row) => {
			const value = row.attributeValue;
			const rollup = value.parent ?? value;
			return {
				attributeId: value.attributeId,
				attributeName: value.attribute.name,
				valueId: value.id,
				value: value.value,
				rollupValueId: rollup.id,
				rollupValue: rollup.value,
			};
		});
		return {
			id: product.id,
			active: product.active,
			title: product.title,
			description: product.description ?? '',
			skus: product.offerings.map((row) => row.sku),
			tags: product.tags,
			vendorSlug: product.vendor.slug,
			categorySlug: product.category?.slug ?? '',
			attributeText: attributes.map((row) => `${row.value} ${row.rollupValue}`).join(' '),
			attributes,
			scalars: product.scalarValues.map((row) => ({
				attributeId: row.attributeId,
				attributeName: row.attribute.name,
				stringValue: row.stringValue,
				numericValue: row.numericValue?.toString() ?? null,
				booleanValue: row.booleanValue,
			})),
			...measures,
		};
	}

	private readFacets(aggregations: unknown): FacetBucket[] {
		const attrs = (aggregations as {
			attrs?: {
				by_attr?: {
					buckets?: Array<{
						key: string;
						name?: { buckets?: Array<{ key: string }> };
						rollups?: {
							buckets?: Array<{
								key: string;
								doc_count: number;
								label?: { buckets?: Array<{ key: string }> };
							}>;
						};
					}>;
				};
			};
		})?.attrs?.by_attr?.buckets ?? [];
		return attrs.map((bucket) => ({
			attributeId: String(bucket.key),
			attributeName: String(bucket.name?.buckets?.[0]?.key ?? bucket.key),
			buckets: (bucket.rollups?.buckets ?? []).map((row) => ({
				valueId: String(row.key),
				value: String(row.label?.buckets?.[0]?.key ?? row.key),
				count: row.doc_count,
			})),
		}));
	}
}
