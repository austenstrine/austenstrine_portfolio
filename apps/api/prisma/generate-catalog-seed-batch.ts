/**
 * Writes current-schema JSON seed files for a 1024-product catalog batch.
 * Re-run whenever the batch should be regenerated; output is deterministic.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { categoryImageUrl, productImageUrls } from './catalog-stock-images';

const PRODUCT_COUNT = 1024;
const SEED_DIR = join(__dirname, 'seed-data');
const UUID_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

type CategoryNode = {
	slug: string;
	name: string;
	imageUrl?: string;
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

const BRANDS = [
	'Aether',
	'Northlight',
	'Harbor & Oak',
	'Field Current',
	'Mira Line',
	'Copperline',
	'Sable & Co.',
	'Lumenwerk',
	'Ridge Provisions',
	'Canvas Theory',
	'Arcadia Goods',
	'Volt & Grain',
];

const ADJECTIVES = [
	'Studio',
	'Everyday',
	'Pro',
	'Compact',
	'Heritage',
	'Summit',
	'Quiet',
	'Precision',
	'Coastal',
	'Modular',
];

function slugifyTitle(title: string, n: string): string {
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 72);
	return `${base}-${n}`;
}

function productCopy(
	category: LeafCategory,
	index: number,
	rand: () => number,
): { title: string; description: string; priceCents: number; weight: string } {
	const brand = pick(rand, BRANDS);
	const adjective = pick(rand, ADJECTIVES);
	const model = `${brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${1200 + (index % 800)}`;
	const noun = category.name.replace(/s$/, '');
	const haystack = `${category.slug} ${category.name}`.toLowerCase();

	let title = `${brand} ${adjective} ${noun}`;
	let description =
		`${brand} ${adjective} ${noun} (${model}) is a demo listing built for Place et Marque. `;
	let priceCents = 1800 + (index % 40) * 125;
	let weight = (0.6 + (index % 18) * 0.35).toFixed(2);

	if(/tv|television/.test(haystack)) {
		const size = pick(rand, ['43', '50', '55', '65', '75']);
		const panel = pick(rand, ['4K QLED', 'OLED', 'Mini-LED']);
		title = `${brand} ${size}" ${panel} Television`;
		description =
			`A ${size}-inch ${panel} set from ${brand} with cinematic contrast, built-in streaming apps, and HDMI 2.1 for consoles. Wall-mount ready; stand and remote included. Model ${model}.`;
		priceCents = 28000 + Number(size) * 220;
		weight = (28 + Number(size) * 0.4).toFixed(1);
	}
	else if(/headphone|earbuds/.test(haystack)) {
		title = `${brand} ${adjective} Wireless Headphones`;
		description =
			`Over-ear ${brand} headphones with active noise cancellation, 30-hour battery, and a folding travel case. Tuned for long listening days. Model ${model}.`;
		priceCents = 7900 + (index % 12) * 500;
		weight = '0.62';
	}
	else if(/laptop/.test(haystack)) {
		const size = pick(rand, ['13', '14', '16']);
		title = `${brand} ${adjective} ${size}" Notebook`;
		description =
			`${size}-inch ${brand} notebook with a quiet keyboard, all-day battery, and a color-accurate display for writing and design. Ships with a 65W USB-C charger. Model ${model}.`;
		priceCents = 89900 + (index % 8) * 5000;
		weight = (2.4 + (index % 5) * 0.2).toFixed(2);
	}
	else if(/desktop/.test(haystack)) {
		title = `${brand} ${adjective} Desktop`;
		description =
			`${brand} compact desktop with quiet cooling, Wi-Fi 6, and room for a second drive. Keyboard and mouse in the box. Model ${model}.`;
		priceCents = 64900 + (index % 7) * 4000;
		weight = (14 + (index % 6) * 0.8).toFixed(1);
	}
	else if(/tablet/.test(haystack)) {
		const size = pick(rand, ['11', '12.9']);
		title = `${brand} ${adjective} ${size}" Tablet`;
		description =
			`${size}-inch ${brand} tablet with a laminated display, stereo speakers, and an all-day battery. Folio cover included; pencil sold separately. Model ${model}.`;
		priceCents = 42900 + (index % 6) * 3000;
		weight = '1.05';
	}
	else if(/monitor/.test(haystack)) {
		const size = pick(rand, ['27', '32', '34']);
		title = `${brand} ${size}" ${adjective} Monitor`;
		description =
			`${size}-inch ${brand} display with USB-C power delivery and thin bezels. Height-adjustable stand; VESA 100 included. Model ${model}.`;
		priceCents = 32900 + Number(size) * 80;
		weight = (11 + Number(size) * 0.15).toFixed(1);
	}
	else if(/speaker|sound/.test(haystack)) {
		title = `${brand} ${adjective} Bluetooth Speaker`;
		description =
			`Portable ${brand} speaker with a 12-hour battery, USB-C charging, and a water-resistant shell for kitchens and patios. Model ${model}.`;
		priceCents = 4900 + (index % 10) * 400;
		weight = '1.80';
	}
	else if(/phone|cell/.test(haystack)) {
		title = `${brand} ${adjective} 5G Phone`;
		description =
			`${brand} 5G smartphone with dual cameras, an OLED display, and a full day of mixed use. Dual SIM tray; charger sold separately. Model ${model}.`;
		priceCents = 49900 + (index % 6) * 4000;
		weight = '0.41';
	}
	else if(/camera/.test(haystack)) {
		title = `${brand} ${adjective} Mirrorless Camera`;
		description =
			`Compact ${brand} camera body with in-body stabilization and 4K video. Kit includes a strap and battery; lens sold separately. Model ${model}.`;
		priceCents = 119000 + (index % 5) * 8000;
		weight = '1.15';
	}
	else if(/shoe|sneaker|boot/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a cushioned midsole and a breathable upper. Demo sizing runs true to size. Model ${model}.`;
		priceCents = 8900 + (index % 9) * 400;
		weight = '1.70';
	}
	else if(/furniture|chair|sofa|table|desk/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`Solid-frame ${noun.toLowerCase()} from ${brand} with a durable finish and adjustable levelers. Ships in one carton; assembly tools included. Model ${model}.`;
		priceCents = 18900 + (index % 15) * 1200;
		weight = (18 + (index % 20) * 1.4).toFixed(1);
	}
	else if(/kitchen|cook|appliance/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} kitchen ${noun.toLowerCase()} with dishwasher-safe parts and a compact footprint for apartment counters. Model ${model}.`;
		priceCents = 3900 + (index % 20) * 250;
		weight = (2.2 + (index % 10) * 0.4).toFixed(2);
	}
	else if(/wire|cable|electrical/.test(haystack)) {
		title = `${brand} ${pick(rand, ['12 AWG', '14 AWG', '10 AWG'])} ${noun}`;
		description =
			`${brand} copper building wire with THHN insulation for branch circuits. Sold by the piece or pack; demo inventory only. Model ${model}.`;
		priceCents = 1200 + (index % 15) * 80;
		weight = (4.5 + (index % 8) * 0.5).toFixed(2);
	}
	else if(/tool|drill|hardware/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a rubberized grip and a lifetime demo warranty. Batteries where applicable are included. Model ${model}.`;
		priceCents = 2900 + (index % 18) * 350;
		weight = (2.8 + (index % 12) * 0.3).toFixed(2);
	}
	else if(/lighting|lamp|bulb|ceiling-fan/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a dimmable LED module and a powder-coated finish. Hardwire or plug-in depending on the listing; canopy hardware included. Model ${model}.`;
		priceCents = 5400 + (index % 16) * 375;
		weight = (3.1 + (index % 10) * 0.4).toFixed(2);
	}
	else if(/clothing|apparel|shirt|dress|jacket/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} in a midweight cotton blend. Machine wash cold; demo sizing chart is on the package. Model ${model}.`;
		priceCents = 3800 + (index % 14) * 250;
		weight = '0.85';
	}
	else if(/handbag|bag|luggage|wallet/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a structured silhouette, interior pocket, and a detachable strap. Demo leather-look finish. Model ${model}.`;
		priceCents = 7200 + (index % 11) * 450;
		weight = '1.40';
	}
	else if(/beauty|makeup|skin|hair|fragrance/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} for everyday routines. Dermatologist-demo formula; 1.7 fl oz. Not for sale outside this catalog. Model ${model}.`;
		priceCents = 1800 + (index % 12) * 150;
		weight = '0.35';
	}
	else if(/grocery|beverage|snack|pantry|breakfast|produce|meat/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} pantry ${noun.toLowerCase()} packed in a resealable pouch. Demo nutrition facts printed on the back; shelf-stable. Model ${model}.`;
		priceCents = 699 + (index % 20) * 45;
		weight = '1.10';
	}
	else if(/garden|patio|grill|plant|lawn/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} outdoor ${noun.toLowerCase()} with weather-resistant materials for patios and small yards. Ships folded; hardware in the lid. Model ${model}.`;
		priceCents = 6400 + (index % 14) * 500;
		weight = (6.5 + (index % 12) * 0.8).toFixed(1);
	}
	else if(/sport|fitness|cycling|camp|hike|outdoor-recreation/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} built for weekend training. Adjustable fit, reflective hits, and a stuff sack in the box. Model ${model}.`;
		priceCents = 4900 + (index % 16) * 325;
		weight = (1.9 + (index % 8) * 0.3).toFixed(2);
	}
	else if(/auto|tire|motorcycle|car-care|oil/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} automotive ${noun.toLowerCase()} for common passenger vehicles. Demo fitment notes ship on a hangtag. Model ${model}.`;
		priceCents = 2400 + (index % 18) * 175;
		weight = (2.4 + (index % 10) * 0.5).toFixed(2);
	}
	else if(/book|magazine|comic/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`A ${brand} trade paperback in the ${noun.toLowerCase()} aisle. 320 pages, matte cover, printed on recycled stock. ISBN demo ${model}.`;
		priceCents = 1599 + (index % 8) * 200;
		weight = '0.90';
	}
	else if(/watch|jewelry/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a sapphire-look crystal and a 5 ATM demo rating. Gift box and extra links included. Model ${model}.`;
		priceCents = 12900 + (index % 10) * 900;
		weight = '0.28';
	}
	else if(/toy|game|puzzle|doll|figure/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} for ages 6+. 140 pieces, illustrated booklet, and a zip pouch for leftover parts. Model ${model}.`;
		priceCents = 2499 + (index % 15) * 175;
		weight = '1.25';
	}
	else if(/baby|diaper|stroller|nursery/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with easy-clean fabrics and a compact fold. Demo safety cards are in the carton. Model ${model}.`;
		priceCents = 8900 + (index % 12) * 700;
		weight = (4.2 + (index % 9) * 0.6).toFixed(1);
	}
	else if(/pet|dog|cat|fish|bird/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} for everyday pet care. Dishwasher-safe where noted; demo sizing runs true. Model ${model}.`;
		priceCents = 1600 + (index % 14) * 125;
		weight = '1.05';
	}
	else if(/guitar|keyboard|drum|instrument/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a gig bag, spare strings or sticks, and a 30-day demo setup. Model ${model}.`;
		priceCents = 18900 + (index % 9) * 1500;
		weight = (5.8 + (index % 7) * 0.7).toFixed(1);
	}
	else if(/office|school|calendar|planner/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} desk ${noun.toLowerCase()} with recycled fiber and a lay-flat bind. Pack of 3 where noted. Model ${model}.`;
		priceCents = 1299 + (index % 16) * 80;
		weight = '0.75';
	}
	else if(/appliance|vacuum|laundry/.test(haystack)) {
		title = `${brand} ${adjective} ${noun}`;
		description =
			`${brand} ${noun.toLowerCase()} with a quiet motor and a washable filter. 120V; demo energy guide in the box. Model ${model}.`;
		priceCents = 15900 + (index % 12) * 1800;
		weight = (12 + (index % 10) * 1.2).toFixed(1);
	}
	else {
		description =
			`${brand} ${noun.toLowerCase()} for everyday use. Finish and colorways vary by listing. Packed for parcel shipping with a recycled mailer. Model ${model}.`;
	}

	return { title, description, priceCents, weight };
}

function withCategoryImages(nodes: CategoryNode[]): CategoryNode[] {
	return nodes.map((node) => ({
		...node,
		imageUrl: categoryImageUrl(node.slug, node.name),
		children: node.children ? withCategoryImages(node.children) : undefined,
	}));
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
	const categoryFile = JSON.parse(
		readFileSync(join(SEED_DIR, 'CatalogCategory.json'), 'utf8'),
	) as SeedFile & { records: CategoryNode[] };
	categoryFile.records = withCategoryImages(categoryFile.records as CategoryNode[]);
	writeSeed('CatalogCategory.json', categoryFile);

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
		const copy = productCopy(category, index, rand);
		const slug = slugifyTitle(copy.title, n);
		const tagPool = [
			category.slug,
			copy.title.split(' ')[0].toLowerCase(),
			pick(rand, ['clearance', 'featured', 'new-arrival', 'bestseller']),
		];
		const electrical = /wire|electrical|cable/.test(category.slug);
		const powered = /tv|video|audio|headphone|speaker|phone|computer|camera|gaming|lighting/.test(
			`${category.slug} ${category.name}`.toLowerCase(),
		);
		productRecords.push({
			id: productId,
			slug,
			title: copy.title,
			description: copy.description,
			imageUrls: productImageUrls(category.slug, category.name, index),
			tags: [...new Set(tagPool)],
			active: true,
			inventoryFromAllocations: false,
			breakFeeMode: 'OFF',
			breakFeeCents: 0,
			vendor: { slug: vendor.slug },
			category: { slug: category.slug },
			weightNumeric: copy.weight,
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
			priceCents: copy.priceCents,
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
				priceCents: copy.priceCents * childQtyPerParent - 400,
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
