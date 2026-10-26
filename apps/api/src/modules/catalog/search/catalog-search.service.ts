import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AttributeValueKind, Prisma } from '@prisma/client';
import { OpenSearchService } from '../../../infra/opensearch/opensearch.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { serializeMeasures } from '../attributes/product-measures';

const INDEX = 'catalog_products';
const ATTRIBUTE_INDEX = 'catalog_attributes';
const VALUE_INDEX = 'catalog_attribute_values';
const SCHEMA_VERSION = 3;
const RECONCILE_MS = 60_000;

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

	private readonly productOps = new Map<string, 'index' | 'delete'>();
	private readonly attributeOps = new Map<string, 'index' | 'delete'>();
	private readonly valueOps = new Map<string, 'index' | 'delete'>();
	private flushTimer?: ReturnType<typeof setTimeout>;
	private reconciling = false;
	private loggedReady = false;

	constructor(
		private readonly prisma: PrismaService,
		private readonly openSearch: OpenSearchService,
	) {}

	async onModuleInit() {
		try {
			this.logger.log('Initializing catalog OpenSearch indexes');
			await this.ensureIndexes();
			await this.reindexIfStale();
		}
		catch(error) {
			this.logger.warn(
				`OpenSearch catalog index not ready: ${error instanceof Error ? error.message : error}`,
			);
		}
		setInterval(() => {
			void this.reindexIfStale().catch((error) => {
				this.logger.warn(
					`OpenSearch catalog reconcile failed: ${error instanceof Error ? error.message : error}`,
				);
			});
		}, RECONCILE_MS);
	}

	async flushNow() {
		if(this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}
		await this.flushScheduled();
	}

	scheduleProduct(id: string, op: 'index' | 'delete') {
		this.productOps.set(id, op);
		this.armFlush();
	}

	scheduleAttribute(id: string, op: 'index' | 'delete') {
		this.attributeOps.set(id, op);
		this.armFlush();
	}

	scheduleAttributeValue(id: string, op: 'index' | 'delete') {
		this.valueOps.set(id, op);
		this.armFlush();
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
				refresh: true,
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
		const suffix = Date.now().toString();
		const next = {
			products: `${INDEX}-${suffix}`,
			attributes: `${ATTRIBUTE_INDEX}-${suffix}`,
			values: `${VALUE_INDEX}-${suffix}`,
		};
		await this.createPhysicalIndex(next.products, this.productMapping());
		await this.createPhysicalIndex(next.attributes, this.attributeMapping());
		await this.createPhysicalIndex(next.values, this.valueMapping());
		await this.reindexProducts(next.products);
		await this.reindexAttributes(next.attributes);
		await this.reindexAttributeValues(next.values);
		const previous = {
			products: await this.backingIndexes(INDEX),
			attributes: await this.backingIndexes(ATTRIBUTE_INDEX),
			values: await this.backingIndexes(VALUE_INDEX),
		};
		await this.openSearch.client.indices.updateAliases({
			body: {
				actions: [
					...this.aliasSwapActions(INDEX, next.products, previous.products),
					...this.aliasSwapActions(ATTRIBUTE_INDEX, next.attributes, previous.attributes),
					...this.aliasSwapActions(VALUE_INDEX, next.values, previous.values),
				],
			},
		});
		await this.deleteIndexes([
			...previous.products,
			...previous.attributes,
			...previous.values,
		].filter((index) => index !== next.products && index !== next.attributes && index !== next.values));
		this.logger.log('Switched catalog search aliases atomically');
	}

	private armFlush() {
		if(this.flushTimer) {
			clearTimeout(this.flushTimer);
		}
		this.flushTimer = setTimeout(() => {
			this.flushTimer = undefined;
			void this.flushScheduled().catch((error) => {
				this.logger.warn(
					`OpenSearch flush failed: ${error instanceof Error ? error.message : error}`,
				);
			});
		}, 75);
	}

	private async flushScheduled() {
		const products = [...this.productOps.entries()];
		const attributes = [...this.attributeOps.entries()];
		const values = [...this.valueOps.entries()];
		this.productOps.clear();
		this.attributeOps.clear();
		this.valueOps.clear();
		if(products.length + attributes.length + values.length === 0) {
			return;
		}
		await this.ensureIndexes();
		const body: Array<Record<string, unknown>> = [];

		for(const [id, op] of products) {
			if(op === 'delete') {
				body.push({ delete: { _index: INDEX, _id: id } });
			}
		}
		const productIndexIds = products.filter(([, op]) => op === 'index').map(([id]) => id);
		if(productIndexIds.length > 0) {
			const rows = await this.prisma.catalogProduct.findMany({
				where: { id: { in: productIndexIds } },
				include: productSearchInclude,
			});
			for(const product of rows) {
				if(!product.active) {
					body.push({ delete: { _index: INDEX, _id: product.id } });
					continue;
				}
				body.push({ index: { _index: INDEX, _id: product.id } }, this.toDocument(product));
			}
		}

		for(const [id, op] of attributes) {
			if(op === 'delete') {
				body.push({ delete: { _index: ATTRIBUTE_INDEX, _id: id } });
			}
		}
		const attributeIndexIds = attributes.filter(([, op]) => op === 'index').map(([id]) => id);
		if(attributeIndexIds.length > 0) {
			const rows = await this.prisma.attribute.findMany({
				where: { id: { in: attributeIndexIds } },
			});
			for(const attribute of rows) {
				body.push(
					{ index: { _index: ATTRIBUTE_INDEX, _id: attribute.id } },
					this.toAttributeDocument(attribute),
				);
			}
		}

		for(const [id, op] of values) {
			if(op === 'delete') {
				body.push({ delete: { _index: VALUE_INDEX, _id: id } });
			}
		}
		const valueIndexIds = values.filter(([, op]) => op === 'index').map(([id]) => id);
		if(valueIndexIds.length > 0) {
			const rows = await this.prisma.attributeValue.findMany({
				where: { id: { in: valueIndexIds } },
				include: { attribute: true, parent: true },
			});
			for(const value of rows) {
				body.push({ index: { _index: VALUE_INDEX, _id: value.id } }, this.toValueDocument(value));
			}
		}

		if(body.length === 0) {
			return;
		}
		await this.bulkWrite(body, true);
	}

	private async reindexIfStale() {
		if(this.reconciling) {
			return;
		}
		this.reconciling = true;
		try {
			const [productCount, attributeCount, valueCount, schema] = await Promise.all([
				this.indexCount(INDEX),
				this.indexCount(ATTRIBUTE_INDEX),
				this.indexCount(VALUE_INDEX),
				this.currentSchemaVersion(),
			]);
			const [pgProducts, pgAttributes, pgValues] = await Promise.all([
				this.prisma.catalogProduct.count({ where: { active: true } }),
				this.prisma.attribute.count(),
				this.prisma.attributeValue.count(),
			]);
			const stale = schema !== SCHEMA_VERSION
				|| productCount !== pgProducts
				|| attributeCount !== pgAttributes
				|| valueCount !== pgValues;
			if(stale) {
				this.logger.log(
					`OpenSearch stale (schema ${schema}/${SCHEMA_VERSION}, products ${productCount}/${pgProducts}, attributes ${attributeCount}/${pgAttributes}, values ${valueCount}/${pgValues}); reindexing`,
				);
				await this.reindexAll();
				this.loggedReady = true;
				return;
			}
			if(!this.loggedReady) {
				this.logger.log(
					`Catalog OpenSearch ready (products ${productCount}, attributes ${attributeCount}, values ${valueCount})`,
				);
				this.loggedReady = true;
			}
		}
		finally {
			this.reconciling = false;
		}
	}

	private async indexCount(index: string) {
		try {
			const count = await this.openSearch.client.count({ index });
			const body = (count as { body?: { count?: number }; count?: number });
			return body.body?.count ?? body.count ?? 0;
		}
		catch {
			return 0;
		}
	}

	private async currentSchemaVersion() {
		const versions = await Promise.all([
			this.mappingSchema(INDEX),
			this.mappingSchema(ATTRIBUTE_INDEX),
			this.mappingSchema(VALUE_INDEX),
		]);
		if(versions.some((version) => version !== SCHEMA_VERSION)) {
			return versions.find((version) => version !== SCHEMA_VERSION) ?? 0;
		}
		return SCHEMA_VERSION;
	}

	private async mappingSchema(index: string) {
		try {
			const mapping = await this.openSearch.client.indices.getMapping({ index });
			const root = ((mapping as { body?: unknown }).body ?? mapping) as Record<
				string,
				{ mappings?: { _meta?: { catalogSchema?: number } } }
			>;
			const mapped = root[index]
				?? Object.values(root).find((row) => row?.mappings);
			const schema = mapped?.mappings?._meta?.catalogSchema;
			return typeof schema === 'number' ? schema : 0;
		}
		catch {
			return 0;
		}
	}

	private async bulkWrite(body: Array<Record<string, unknown>>, refresh: boolean) {
		const response = await this.openSearch.client.bulk({ body, refresh });
		const payload = (response as { body?: { errors?: boolean; items?: Array<Record<string, { error?: { reason?: string } }>> }; errors?: boolean }).body
			?? response as { errors?: boolean; items?: Array<Record<string, { error?: { reason?: string } }>> };
		if(!payload.errors) {
			return;
		}
		const reasons = (payload.items ?? [])
			.flatMap((item) => Object.values(item))
			.map((row) => row.error?.reason)
			.filter((reason): reason is string => Boolean(reason))
			.slice(0, 5);
		this.logger.warn(`OpenSearch bulk had errors: ${reasons.join('; ') || 'unknown'}`);
	}

	private async reindexProducts(index: string) {
		const products = await this.prisma.catalogProduct.findMany({
			where: { active: true },
			include: productSearchInclude,
		});
		if(products.length === 0) {
			return;
		}
		const body = products.flatMap((product) => [
			{ index: { _index: index, _id: product.id } },
			this.toDocument(product),
		]);
		await this.bulkWrite(body, true);
		this.logger.log(`Indexed ${products.length} catalog products`);
	}

	private async reindexAttributes(index: string) {
		const attributes = await this.prisma.attribute.findMany();
		if(attributes.length === 0) {
			return;
		}
		const body = attributes.flatMap((attribute) => [
			{ index: { _index: index, _id: attribute.id } },
			this.toAttributeDocument(attribute),
		]);
		await this.bulkWrite(body, true);
		this.logger.log(`Indexed ${attributes.length} attributes`);
	}

	private async reindexAttributeValues(index: string) {
		const values = await this.prisma.attributeValue.findMany({
			include: { attribute: true, parent: true },
		});
		if(values.length === 0) {
			return;
		}
		const body = values.flatMap((value) => [
			{ index: { _index: index, _id: value.id } },
			this.toValueDocument(value),
		]);
		await this.bulkWrite(body, true);
		this.logger.log(`Indexed ${values.length} attribute values`);
	}

	async search(query: {
		q?: string;
		categorySlug?: string;
		vendorSlug?: string;
		limit?: number;
		offset?: number;
		sort?: string;
		inStock?: boolean;
		rollupValueIds?: string[];
		omitValueIds?: string[];
	}) {
		const live = await this.openSearch.ping().catch(() => false);
		if(!live) {
			return this.prismaFallback(query);
		}

		const analysis = await this.analyzeQuery(query);
		const size = Math.min(Math.max(query.limit ?? 24, 1), 96);
		const from = Math.max(query.offset ?? 0, 0);
		const filters: Array<Record<string, unknown>> = [
			{ term: { active: true } },
		];
		if(query.categorySlug) {
			const slugs = await this.categorySlugsWithDescendants(query.categorySlug);
			filters.push({ terms: { categorySlug: slugs } });
		}
		if(query.vendorSlug) {
			filters.push({ term: { vendorSlug: query.vendorSlug } });
		}
		if(query.inStock) {
			filters.push({ range: { availableQty: { gt: 0 } } });
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
					fuzziness: 'AUTO',
				},
			});
		}

		try {
			const response = await this.openSearch.client.search({
				index: INDEX,
				body: {
					from,
					size,
					track_total_hits: true,
					sort: this.searchSort(query.sort, must.length > 0),
					query: {
						bool: {
							must: must.length > 0 ? must : [{ match_all: {} }],
							filter: filters,
						},
					},
					aggs: {
						categories: { terms: { field: 'categorySlug', size: 80 } },
						vendors: { terms: { field: 'vendorSlug', size: 40 } },
						attrs: {
							nested: { path: 'attributes' },
							aggs: {
								by_attr: {
									terms: { field: 'attributes.attributeId', size: 20 },
									aggs: {
										name: { terms: { field: 'attributes.attributeName', size: 1 } },
										rollups: {
											terms: { field: 'attributes.rollupValueId', size: 24 },
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
				categoryFacets: this.readTermFacets(response.body.aggregations, 'categories'),
				vendorFacets: this.readTermFacets(response.body.aggregations, 'vendors'),
				total: this.readTotal(response.body.hits?.total),
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
		offset?: number;
		sort?: string;
		inStock?: boolean;
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
			const slugs = await this.categorySlugsWithDescendants(query.categorySlug);
			where.category = { slug: { in: slugs } };
		}
		if(query.vendorSlug) {
			where.vendor = { slug: query.vendorSlug };
		}
		if(query.inStock) {
			where.offerings = { some: { availableQty: { gt: 0 } } };
		}
		const take = Math.min(Math.max(query.limit ?? 24, 1), 96);
		const skip = Math.max(query.offset ?? 0, 0);
		const [total, items] = await Promise.all([
			this.prisma.catalogProduct.count({ where }),
			this.prisma.catalogProduct.findMany({
				where,
				include: {
					vendor: true,
					category: true,
					offerings: { include: { uom: true } },
				},
				orderBy: { title: 'asc' },
				skip,
				take,
			}),
		]);
		if(query.sort === 'price-asc' || query.sort === 'price-desc') {
			const dir = query.sort === 'price-asc' ? 1 : -1;
			items.sort((left, right) => dir * ((left.offerings[0]?.priceCents ?? 0) - (right.offerings[0]?.priceCents ?? 0)));
		}
		return {
			items,
			appliedFilters: [] as AppliedSearchFilter[],
			facets: [] as FacetBucket[],
			categoryFacets: [] as Array<{ slug: string; count: number }>,
			vendorFacets: [] as Array<{ slug: string; count: number }>,
			total,
			source: 'prisma' as const,
		};
	}

	private async categorySlugsWithDescendants(slug: string) {
		const categories = await this.prisma.catalogCategory.findMany({
			select: { id: true, slug: true, parentId: true },
		});
		const root = categories.find((row) => row.slug === slug);
		if(!root) {
			return [slug];
		}
		const byParent = new Map<string | null, typeof categories>();
		for(const row of categories) {
			const list = byParent.get(row.parentId) ?? [];
			list.push(row);
			byParent.set(row.parentId, list);
		}
		const slugs = [root.slug];
		const walk = (id: string) => {
			for(const child of byParent.get(id) ?? []) {
				slugs.push(child.slug);
				walk(child.id);
			}
		};
		walk(root.id);
		return slugs;
	}

	private searchSort(sort: string | undefined, hasQuery: boolean) {
		const title = this.sortClause('title.raw', 'asc', 'keyword');
		if(sort === 'price-asc') {
			return [this.sortClause('priceCents', 'asc', 'integer'), title];
		}
		if(sort === 'price-desc') {
			return [this.sortClause('priceCents', 'desc', 'integer'), title];
		}
		if(sort === 'title') {
			return [title];
		}
		if(hasQuery) {
			return [{ _score: 'desc' }, title];
		}
		return [title];
	}

	private sortClause(field: string, order: 'asc' | 'desc', unmappedType: string) {
		return { [field]: { order, unmapped_type: unmappedType, missing: '_last' } };
	}

	private readTotal(total: unknown) {
		if(typeof total === 'number') {
			return total;
		}
		if(total && typeof total === 'object' && typeof (total as { value?: unknown }).value === 'number') {
			return (total as { value: number }).value;
		}
		return 0;
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
		await this.ensureIndexes();
	}

	private productMapping() {
		return {
			active: { type: 'boolean' },
			title: { type: 'text', fields: { raw: { type: 'keyword' } } },
			priceCents: { type: 'integer' },
			availableQty: { type: 'double' },
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
		};
	}

	private attributeMapping() {
		return {
			name: { type: 'text', fields: { raw: { type: 'keyword' } } },
			vendorId: { type: 'keyword' },
			valueKind: { type: 'keyword' },
			unit: { type: 'keyword' },
			minNumeric: { type: 'double' },
			maxNumeric: { type: 'double' },
		};
	}

	private valueMapping() {
		return {
			attributeId: { type: 'keyword' },
			attributeName: { type: 'keyword' },
			value: { type: 'text', fields: { raw: { type: 'keyword' } } },
			vendorId: { type: 'keyword' },
			parentId: { type: 'keyword' },
			parentValue: { type: 'keyword' },
			categoryId: { type: 'keyword' },
			groupId: { type: 'keyword' },
			sortOrder: { type: 'integer' },
		};
	}

	private async ensureIndexes() {
		await this.ensureAlias(INDEX, this.productMapping());
		await this.ensureAlias(ATTRIBUTE_INDEX, this.attributeMapping());
		await this.ensureAlias(VALUE_INDEX, this.valueMapping());
	}

	private async indexExists(index: string) {
		try {
			const exists = await this.openSearch.client.indices.exists({ index });
			return exists.body === true;
		}
		catch {
			return false;
		}
	}

	private async backingIndexes(alias: string) {
		try {
			const response = await this.openSearch.client.indices.getAlias({ name: alias });
			const body = ((response as { body?: Record<string, unknown> }).body ?? response) as Record<
				string,
				unknown
			>;
			return Object.keys(body).filter((key) => {
				const row = body[key];
				return Boolean(row && typeof row === 'object' && 'aliases' in row);
			});
		}
		catch {
			if(await this.indexExists(alias)) {
				return [alias];
			}
			return [];
		}
	}

	private aliasSwapActions(alias: string, nextIndex: string, previous: string[]) {
		const actions: Array<Record<string, unknown>> = [
			{ add: { index: nextIndex, alias, is_write_index: true } },
		];
		for(const old of previous) {
			if(old === nextIndex || old === alias) {
				continue;
			}
			actions.push({ remove: { index: old, alias } });
		}
		return actions;
	}

	private async deleteIndexes(indexes: string[]) {
		const unique = [...new Set(indexes)];
		for(const index of unique) {
			try {
				await this.openSearch.client.indices.delete({
					index,
					ignore_unavailable: true,
				});
			}
			catch {
				continue;
			}
		}
	}

	private async createPhysicalIndex(index: string, properties: Record<string, unknown>) {
		await this.openSearch.client.indices.create({
			index,
			body: {
				settings: { number_of_shards: 1, number_of_replicas: 0 },
				mappings: {
					_meta: { catalogSchema: SCHEMA_VERSION },
					properties,
				},
			},
		});
	}

	private async ensureAlias(alias: string, properties: Record<string, unknown>) {
		if(await this.indexExists(alias)) {
			return;
		}
		const physical = `${alias}-${Date.now()}`;
		await this.createPhysicalIndex(physical, properties);
		await this.openSearch.client.indices.updateAliases({
			body: {
				actions: [{ add: { index: physical, alias, is_write_index: true } }],
			},
		});
	}

	private toAttributeDocument(attribute: {
		id: string;
		name: string;
		vendorId: string | null;
		valueKind: AttributeValueKind;
		unit: string | null;
		minNumeric: { toString(): string } | null;
		maxNumeric: { toString(): string } | null;
	}) {
		return {
			id: attribute.id,
			name: attribute.name,
			vendorId: attribute.vendorId,
			valueKind: attribute.valueKind,
			unit: attribute.unit,
			minNumeric: attribute.minNumeric ? Number(attribute.minNumeric.toString()) : null,
			maxNumeric: attribute.maxNumeric ? Number(attribute.maxNumeric.toString()) : null,
		};
	}

	private toValueDocument(value: {
		id: string;
		attributeId: string;
		value: string;
		vendorId: string | null;
		parentId: string | null;
		categoryId: string | null;
		groupId: string | null;
		sortOrder: number;
		attribute: { name: string };
		parent: { value: string } | null;
	}) {
		return {
			id: value.id,
			attributeId: value.attributeId,
			attributeName: value.attribute.name,
			value: value.value,
			vendorId: value.vendorId,
			parentId: value.parentId,
			parentValue: value.parent?.value ?? null,
			categoryId: value.categoryId,
			groupId: value.groupId,
			sortOrder: value.sortOrder,
		};
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
		const prices = product.offerings.map((row) => row.priceCents);
		const qty = product.offerings.reduce((sum, row) => sum + Number(row.availableQty.toString()), 0);
		return {
			id: product.id,
			active: product.active,
			title: product.title,
			description: product.description ?? '',
			skus: product.offerings.map((row) => row.sku),
			tags: product.tags,
			vendorSlug: product.vendor.slug,
			categorySlug: product.category?.slug ?? '',
			priceCents: prices.length > 0 ? Math.min(...prices) : null,
			availableQty: qty,
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

	private readTermFacets(aggregations: unknown, name: 'categories' | 'vendors') {
		const buckets = (aggregations as {
			categories?: { buckets?: Array<{ key: string; doc_count: number }> };
			vendors?: { buckets?: Array<{ key: string; doc_count: number }> };
		})?.[name]?.buckets ?? [];
		return buckets
			.map((bucket) => ({
				slug: String(bucket.key),
				count: bucket.doc_count,
			}))
			.filter((row) => row.slug);
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
