/**
 * Writes current-schema JSON seed files for a 1024-product catalog batch.
 * Re-run whenever the batch should be regenerated; output is deterministic.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PRODUCT_COUNT = 1024;
const SEED_DIR = join(__dirname, 'seed-data');
const UUID_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

type CategoryNode = {
	slug: string;
	name: string;
	children?: CategoryNode[];
};

type SeedFile = {
	$prismaJsonSeed: Record<string, unknown>;
	records: Record<string, unknown>[];
};

type LeafCategory = { slug: string; name: string };

type AttrDef = {
	key: string;
	name: string;
	vendorScoped?: boolean;
	values: Array<{
		key: string;
		value: string;
		parentKey?: string;
		vendorScoped?: boolean;
	}>;
};

function uuidv5(name: string, namespace: string): string {
	const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
	const hash = createHash('sha1').update(ns).update(name).digest();
	hash[6] = (hash[6] & 0x0f) | 0x50;
	hash[8] = (hash[8] & 0x3f) | 0x80;
	const hex = hash.subarray(0, 16).toString('hex');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function seedId(kind: string, key: string): string {
	return uuidv5(`${kind}:${key}`, UUID_NS);
}

function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(rand: () => number, items: T[]): T {
	return items[Math.floor(rand() * items.length) % items.length];
}

function vendorValueCategories(key: string, leaves: LeafCategory[], limit: number): LeafCategory[] {
	const start = Number.parseInt(seedId('cats', key).replace(/-/g, '').slice(0, 8), 16) % leaves.length;
	const picked: LeafCategory[] = [];
	for(let offset = 0; offset < leaves.length && picked.length < limit; offset += 1) {
		picked.push(leaves[(start + offset * 17) % leaves.length]);
	}
	return picked;
}

function leafCategories(): LeafCategory[] {
	const file = JSON.parse(
		readFileSync(join(SEED_DIR, 'CatalogCategory.json'), 'utf8'),
	) as { records: CategoryNode[] };
	const leaves: LeafCategory[] = [];
	const walk = (node: CategoryNode) => {
		if(!node.children?.length) {
			leaves.push({ slug: node.slug, name: node.name });
			return;
		}
		for(const child of node.children) {
			walk(child);
		}
	};
	for(const root of file.records) {
		walk(root);
	}
	return leaves;
}

function writeSeed(filename: string, file: SeedFile): void {
	writeFileSync(join(SEED_DIR, filename), `${JSON.stringify(file, null, 2)}\n`);
}

const ATTRIBUTES: AttrDef[] = [
	{
		key: 'color',
		name: 'Color',
		values: [
			{ key: 'green', value: 'Green' },
			{ key: 'red', value: 'Red' },
			{ key: 'blue', value: 'Blue' },
			{ key: 'black', value: 'Black' },
			{ key: 'white', value: 'White' },
			{ key: 'yellow', value: 'Yellow' },
			{ key: 'brown', value: 'Brown' },
			{ key: 'gray', value: 'Gray' },
			{ key: 'algae', value: 'algae', parentKey: 'green', vendorScoped: true },
			{ key: 'pine', value: 'pine', parentKey: 'green', vendorScoped: true },
			{ key: 'verdigris', value: 'verdigris', parentKey: 'green', vendorScoped: true },
		],
	},
	{
		key: 'size',
		name: 'Size',
		values: [
			{ key: 'xs', value: 'XS' },
			{ key: 's', value: 'S' },
			{ key: 'm', value: 'M' },
			{ key: 'l', value: 'L' },
			{ key: 'xl', value: 'XL' },
		],
	},
	{
		key: 'material',
		name: 'Material',
		values: [
			{ key: 'cotton', value: 'Cotton' },
			{ key: 'leather', value: 'Leather' },
			{ key: 'steel', value: 'Steel' },
			{ key: 'plastic', value: 'Plastic' },
			{ key: 'wood', value: 'Wood' },
			{ key: 'copper', value: 'Copper' },
		],
	},
	{
		key: 'pattern',
		name: 'Pattern',
		values: [
			{ key: 'solid', value: 'Solid' },
			{ key: 'striped', value: 'Striped' },
			{ key: 'plaid', value: 'Plaid' },
		],
	},
	{
		key: 'gauge',
		name: 'Gauge',
		values: [
			{ key: '10awg', value: '10 AWG' },
			{ key: '12awg', value: '12 AWG' },
			{ key: '14awg', value: '14 AWG' },
			{ key: '16awg', value: '16 AWG' },
		],
	},
	{
		key: 'conductor',
		name: 'Conductor',
		values: [
			{ key: 'copper', value: 'Copper' },
			{ key: 'aluminum', value: 'Aluminum' },
		],
	},
	{
		key: 'insulation',
		name: 'Insulation',
		values: [
			{ key: 'thhn', value: 'THHN' },
			{ key: 'thwn', value: 'THWN' },
			{ key: 'xhhw', value: 'XHHW' },
		],
	},
	{
		key: 'demo-finish',
		name: 'Demo finish',
		vendorScoped: true,
		values: [
			{ key: 'matte', value: 'Matte', vendorScoped: true },
			{ key: 'gloss', value: 'Gloss', vendorScoped: true },
		],
	},
];

function main(): void {
	const rand = mulberry32(1024);
	const leaves = leafCategories();
	if(leaves.length === 0) {
		throw new Error('CatalogCategory.json has no leaf categories.');
	}

	const vendor = {
		id: seedId('vendor', 'demo-supply'),
		slug: 'demo-supply',
		name: 'Demo Supply Co.',
		isSuperVendor: false,
	};

	writeSeed('Vendor.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'Vendor',
			identityField: 'id',
			applyOrder: 10,
		},
		records: [vendor],
	});

	const attributeRecords: Record<string, unknown>[] = [];
	const valueRecords: Record<string, unknown>[] = [];
	const valueIds = new Map<string, string>();

	for(const attribute of ATTRIBUTES) {
		const attributeId = seedId('attribute', attribute.key);
		attributeRecords.push({
			id: attributeId,
			name: attribute.name,
			vendorId: attribute.vendorScoped ? vendor.id : null,
		});
		for(const [index, value] of attribute.values.entries()) {
			const parentId = value.parentKey
				? seedId('attribute-value', `${attribute.key}:${value.parentKey}`)
				: null;
			const vendorScoped = Boolean(value.vendorScoped || attribute.vendorScoped);
			if(vendorScoped) {
				const groupId = seedId('attr-group', `${attribute.key}:${value.key}`);
				for(const category of vendorValueCategories(`${attribute.key}:${value.key}`, leaves, 3)) {
					const valueKey = `${attribute.key}:${value.key}:${category.slug}`;
					const valueId = seedId('attribute-value', valueKey);
					valueIds.set(valueKey, valueId);
					valueRecords.push({
						id: valueId,
						value: value.value,
						sortOrder: index,
						groupId,
						attribute: { id: attributeId },
						vendor: { id: vendor.id },
						...(parentId ? { parent: { id: parentId } } : {}),
						category: { slug: category.slug },
					});
				}
				continue;
			}

			const valueId = seedId('attribute-value', `${attribute.key}:${value.key}`);
			valueIds.set(`${attribute.key}:${value.key}`, valueId);
			valueRecords.push({
				id: valueId,
				value: value.value,
				sortOrder: index,
				attribute: { id: attributeId },
				...(parentId ? { parent: { id: parentId } } : {}),
			});
		}
	}

	writeSeed('Attribute.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'Attribute',
			identityField: 'id',
			applyOrder: 20,
		},
		records: attributeRecords,
	});
	writeSeed('AttributeValue.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'AttributeValue',
			identityField: 'id',
			applyOrder: 30,
		},
		records: valueRecords,
	});

	const productRecords: Record<string, unknown>[] = [];
	const offeringRecords: Record<string, unknown>[] = [];
	const containmentRecords: Record<string, unknown>[] = [];
	const junctionRecords: Record<string, unknown>[] = [];
	const globalValueKeys = [...valueIds.keys()].filter((key) => key.split(':').length === 2);

	for(let index = 1; index <= PRODUCT_COUNT; index += 1) {
		const n = String(index).padStart(4, '0');
		const category = leaves[(index - 1) % leaves.length];
		const productId = seedId('product', n);
		const slug = `seed-listing-${n}`;
		const tagPool = [category.slug, 'seed-batch', pick(rand, ['clearance', 'featured', 'new', 'bulk'])];
		const electrical = /wire|electrical|cable/.test(category.slug);
		const powered = /tv|video|audio|headphone|speaker|phone|computer|camera|gaming|lighting/.test(
			`${category.slug} ${category.name}`.toLowerCase(),
		);
		productRecords.push({
			id: productId,
			slug,
			title: `${category.name} seed listing ${n}`,
			description: `Deterministic seed product ${n} in ${category.name}.`,
			tags: [...new Set(tagPool)],
			active: true,
			inventoryFromAllocations: false,
			breakFeeMode: 'OFF',
			breakFeeCents: 0,
			vendor: { slug: vendor.slug },
			category: { slug: category.slug },
			weightNumeric: (0.25 + (index % 40) * 0.15).toFixed(2),
			weightUnit: 'lb',
			gtin: `000${n}000000`.slice(-12),
			mpn: `MPN-${n}`,
			countryOfOrigin: pick(rand, ['US', 'CN', 'MX', 'DE', 'JP']),
			condition: 'NEW',
			...(powered
				? {
						voltageNumeric: pick(rand, ['5', '12', '120', '240']),
						wattageNumeric: String(8 + (index % 180)),
						frequencyHzNumeric: '60',
					}
				: {}),
			...(index % 3 === 0
				? {
						packageLengthNumeric: String(6 + (index % 12)),
						packageWidthNumeric: String(4 + (index % 8)),
						packageHeightNumeric: String(2 + (index % 6)),
						packageLinearUnit: 'in',
						packageWeightNumeric: (0.4 + (index % 20) * 0.2).toFixed(2),
						packageWeightUnit: 'lb',
					}
				: {}),
		});

		const pieceId = seedId('offering', `${n}:piece`);
		const hasPack = index % 4 === 0;
		const pieceQty = hasPack ? 0 : (index % 20) + 1;
		const packQty = hasPack ? (index % 8) + 2 : 0;
		const childQtyPerParent = 12;
		offeringRecords.push({
			id: pieceId,
			sku: `SL-${n}`,
			offeringKey: 'piece',
			role: 'PIECE',
			priceCents: 400 + (index % 50) * 25,
			currency: 'USD',
			qtyOnHand: String(pieceQty),
			availableQty: String(hasPack ? packQty * childQtyPerParent : pieceQty),
			tracksOwnQty: true,
			minUnbrokenQty: '-1',
			breakPoolAboveQty: '0',
			inheritQtyToChildren: false,
			product: { id: productId },
			vendor: { slug: vendor.slug },
			uom: { code: 'EA' },
		});

		if(hasPack) {
			const packId = seedId('offering', `${n}:pack`);
			offeringRecords.push({
				id: packId,
				sku: `SL-${n}-PK`,
				offeringKey: 'pack',
				role: 'PACK',
				priceCents: 4800 + (index % 10) * 100,
				currency: 'USD',
				qtyOnHand: String(packQty),
				availableQty: String(packQty),
				tracksOwnQty: true,
				minUnbrokenQty: '1',
				breakPoolAboveQty: '0',
				inheritQtyToChildren: true,
				product: { id: productId },
				vendor: { slug: vendor.slug },
				uom: { code: 'PK' },
			});
			containmentRecords.push({
				id: seedId('containment', n),
				parentOffering: { id: packId },
				childOffering: { id: pieceId },
				childQtyPerParent: String(childQtyPerParent),
			});
		}

		const assigned = new Set<string>();
		const colorChoices = [
			'color:green',
			'color:red',
			'color:blue',
			'color:black',
			`color:algae:${category.slug}`,
			`color:pine:${category.slug}`,
		].filter((key) => valueIds.has(key));
		assigned.add(pick(rand, colorChoices));
		assigned.add(pick(rand, globalValueKeys));
		if(rand() > 0.4) {
			assigned.add(pick(rand, globalValueKeys));
		}
		const scopedKeys = [...valueIds.keys()].filter((key) => key.endsWith(`:${category.slug}`));
		if(scopedKeys.length > 0 && rand() > 0.5) {
			assigned.add(pick(rand, scopedKeys));
		}
		if(electrical) {
			assigned.add(pick(rand, ['gauge:12awg', 'gauge:14awg', 'conductor:copper']));
			assigned.add('insulation:thhn');
		}

		let sortOrder = 0;
		for(const key of assigned) {
			const attributeValueId = valueIds.get(key);
			if(!attributeValueId) {
				continue;
			}
			junctionRecords.push({
				id: seedId('product-attr', `${n}:${key}`),
				productId,
				attributeValueId,
				sortOrder,
			});
			sortOrder += 1;
		}
	}

	writeSeed('CatalogProduct.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'CatalogProduct',
			identityField: 'id',
			applyOrder: 200,
		},
		records: productRecords,
	});
	writeSeed('ProductOffering.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'ProductOffering',
			identityField: 'id',
			applyOrder: 210,
		},
		records: offeringRecords,
	});
	writeSeed('OfferingContainment.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'OfferingContainment',
			identityField: 'id',
			applyOrder: 220,
		},
		records: containmentRecords,
	});
	writeSeed('ProductAttributeValue.json', {
		$prismaJsonSeed: {
			format: 'table',
			model: 'ProductAttributeValue',
			identityField: 'id',
			applyOrder: 230,
		},
		records: junctionRecords,
	});

	console.log(
		`Wrote ${productRecords.length} products, ${offeringRecords.length} packs/pieces, ${junctionRecords.length} attribute links.`,
	);
}

main();
