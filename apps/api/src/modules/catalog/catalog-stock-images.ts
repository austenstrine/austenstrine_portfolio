/**
 * Royalty-free Unsplash photos (https://unsplash.com/license) used as demo
 * catalog imagery. Files land in the CDN origin so seed does not depend on
 * the CDN process being up.
 */
import { createWriteStream, existsSync } from 'fs';
import { mkdir, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export type StockTheme =
	| 'tv'
	| 'audio'
	| 'computer'
	| 'phone'
	| 'camera'
	| 'watch'
	| 'furniture'
	| 'kitchen'
	| 'lighting'
	| 'tools'
	| 'apparel'
	| 'shoes'
	| 'bag'
	| 'beauty'
	| 'grocery'
	| 'plant'
	| 'sport'
	| 'auto'
	| 'book'
	| 'general';

type Photo = {
	id: string;
	file: string;
};

const THEME_PHOTOS: Record<StockTheme, Photo[]> = {
	tv: [
		{ id: 'photo-1593359677879-a4bb92f829d1', file: 'hero.jpg' },
		{ id: 'photo-1461151304267-38535e780c79', file: 'alt-1.jpg' },
		{ id: 'photo-1593784991095-a205069470b6', file: 'alt-2.jpg' },
	],
	audio: [
		{ id: 'photo-1505740420928-5e560c06d30e', file: 'hero.jpg' },
		{ id: 'photo-1545454675-3538b81dd7c8', file: 'alt-1.jpg' },
		{ id: 'photo-1484704849700-f032a568e944', file: 'alt-2.jpg' },
	],
	computer: [
		{ id: 'photo-1517336714731-489689fd1ca8', file: 'hero.jpg' },
		{ id: 'photo-1517694712202-14dd9538aa97', file: 'alt-1.jpg' },
		{ id: 'photo-1496181133206-80ce9b88a853', file: 'alt-2.jpg' },
	],
	phone: [
		{ id: 'photo-1511707171634-5f897ff02aa9', file: 'hero.jpg' },
		{ id: 'photo-1510557880182-3d4d3cba35a5', file: 'alt-1.jpg' },
		{ id: 'photo-1580910051074-3eb694886505', file: 'alt-2.jpg' },
	],
	camera: [
		{ id: 'photo-1516035069371-29a1b244cc32', file: 'hero.jpg' },
		{ id: 'photo-1502920917128-1aa500764cbd', file: 'alt-1.jpg' },
		{ id: 'photo-1495707902641-75cac588d2e9', file: 'alt-2.jpg' },
	],
	watch: [
		{ id: 'photo-1523275335684-37898b6baf30', file: 'hero.jpg' },
		{ id: 'photo-1524592094714-0f23395d153b', file: 'alt-1.jpg' },
		{ id: 'photo-1508685096489-7aacd43bd3b1', file: 'alt-2.jpg' },
	],
	furniture: [
		{ id: 'photo-1555041469-a586c61ea9bc', file: 'hero.jpg' },
		{ id: 'photo-1493663284031-b7e3aefcae8e', file: 'alt-1.jpg' },
		{ id: 'photo-1506439773649-6e0eb8cfb237', file: 'alt-2.jpg' },
	],
	kitchen: [
		{ id: 'photo-1556909114-f6e7ad7d3136', file: 'hero.jpg' },
		{ id: 'photo-1556911220-bff31c812dba', file: 'alt-1.jpg' },
		{ id: 'photo-1570222094114-d054a817e56b', file: 'alt-2.jpg' },
	],
	lighting: [
		{ id: 'photo-1507473885765-e6ed057f782c', file: 'hero.jpg' },
		{ id: 'photo-1513506003901-1e6a229e2d15', file: 'alt-1.jpg' },
		{ id: 'photo-1543198126-a8ad8e47fb22', file: 'alt-2.jpg' },
	],
	tools: [
		{ id: 'photo-1504148455328-c376907d081c', file: 'hero.jpg' },
		{ id: 'photo-1581147033415-58a7cd4aa2f0', file: 'alt-1.jpg' },
		{ id: 'photo-1530124566582-a618bc2615dc', file: 'alt-2.jpg' },
	],
	apparel: [
		{ id: 'photo-1523381210434-271e8be1f52b', file: 'hero.jpg' },
		{ id: 'photo-1489987707025-afc88f4ade46', file: 'alt-1.jpg' },
		{ id: 'photo-1434389677669-e08b4cac3105', file: 'alt-2.jpg' },
	],
	shoes: [
		{ id: 'photo-1542291026-7eec264c27ff', file: 'hero.jpg' },
		{ id: 'photo-1460353581641-37baddab0fa2', file: 'alt-1.jpg' },
		{ id: 'photo-1549298916-b41d501d3772', file: 'alt-2.jpg' },
	],
	bag: [
		{ id: 'photo-1548036328-c9fa89d128fa', file: 'hero.jpg' },
		{ id: 'photo-1553062407-98eeb64c6a62', file: 'alt-1.jpg' },
		{ id: 'photo-1590874103328-eac38a941313', file: 'alt-2.jpg' },
	],
	beauty: [
		{ id: 'photo-1596462502278-27bfdc403348', file: 'hero.jpg' },
		{ id: 'photo-1571781926291-c777cd218836', file: 'alt-1.jpg' },
		{ id: 'photo-1522335789203-aabd1fc54bc9', file: 'alt-2.jpg' },
	],
	grocery: [
		{ id: 'photo-1542838132-92c53300491e', file: 'hero.jpg' },
		{ id: 'photo-1516594798947-e65505dbb29d', file: 'alt-1.jpg' },
		{ id: 'photo-1466637574441-749b8f19452f', file: 'alt-2.jpg' },
	],
	plant: [
		{ id: 'photo-1485955900006-10f4d324d411', file: 'hero.jpg' },
		{ id: 'photo-1459411552884-841db9b3cc2a', file: 'alt-1.jpg' },
		{ id: 'photo-1416879595882-3373a0480b5b', file: 'alt-2.jpg' },
	],
	sport: [
		{ id: 'photo-1517649763962-0c623066027c', file: 'hero.jpg' },
		{ id: 'photo-1461897104016-0b3b00cc81ee', file: 'alt-1.jpg' },
		{ id: 'photo-1574629810360-7efbbe195018', file: 'alt-2.jpg' },
	],
	auto: [
		{ id: 'photo-1492144534655-ae79c964c9d7', file: 'hero.jpg' },
		{ id: 'photo-1486262715619-67b85e0b08d3', file: 'alt-1.jpg' },
		{ id: 'photo-1503376780353-7e6692767b70', file: 'alt-2.jpg' },
	],
	book: [
		{ id: 'photo-1512820790803-83ca734da794', file: 'hero.jpg' },
		{ id: 'photo-1495446815901-a7297e633e8d', file: 'alt-1.jpg' },
		{ id: 'photo-1524995997946-a1c2e315a42f', file: 'alt-2.jpg' },
	],
	general: [
		{ id: 'photo-1441986300917-64674bd600d8', file: 'hero.jpg' },
		{ id: 'photo-1472851294608-062f824d29cc', file: 'alt-1.jpg' },
		{ id: 'photo-1523275335684-37898b6baf30', file: 'alt-2.jpg' },
	],
};

const THEME_RULES: Array<{ theme: StockTheme; test: RegExp }> = [
	{ theme: 'tv', test: /tv|television|home-theater|projector|streaming|video/ },
	{ theme: 'audio', test: /headphone|speaker|audio|earbuds|soundbar|portable-audio/ },
	{ theme: 'computer', test: /laptop|desktop|tablet|computer|monitor|component|keyboard|mouse|printer|storage|networking/ },
	{ theme: 'phone', test: /phone|cell|mobile|smartwatch|wearable/ },
	{ theme: 'camera', test: /camera|photo|drone|binocular/ },
	{ theme: 'watch', test: /watch|jewelry|clock/ },
	{ theme: 'furniture', test: /furniture|sofa|chair|table|mattress|bed|desk|cabinet|storage-furniture/ },
	{ theme: 'kitchen', test: /kitchen|cook|appliance|dinnerware|bakeware|cutlery|refrigerat|dishwasher|oven/ },
	{ theme: 'lighting', test: /light|lamp|bulb|fixture/ },
	{ theme: 'tools', test: /tool|hardware|drill|saw|paint|plumbing|electrical|wire|cable|fastener/ },
	{ theme: 'apparel', test: /clothing|shirt|dress|jacket|coat|pants|apparel|men|women|kids/ },
	{ theme: 'shoes', test: /shoe|sneaker|boot|footwear/ },
	{ theme: 'bag', test: /bag|backpack|luggage|wallet|purse/ },
	{ theme: 'beauty', test: /beauty|cosmetic|skincare|fragrance|personal-care|health/ },
	{ theme: 'grocery', test: /grocery|food|snack|beverage|coffee|tea|pantry/ },
	{ theme: 'plant', test: /plant|garden|outdoor|lawn|patio/ },
	{ theme: 'sport', test: /sport|fitness|bike|bicycle|camp|hike|outdoor-recreation|golf|yoga/ },
	{ theme: 'auto', test: /auto|car|vehicle|motorcycle|tire/ },
	{ theme: 'book', test: /book|media|music|movie|office|stationery|paper/ },
];

export function themeForCategory(slug: string, name = ''): StockTheme {
	const haystack = `${slug} ${name}`.toLowerCase();
	for(const rule of THEME_RULES) {
		if(rule.test.test(haystack)) {
			return rule.theme;
		}
	}
	return 'general';
}

export function stockMediaPath(theme: StockTheme, file: string): string {
	return `/media/catalog/stock/${theme}/${file}`;
}

export function categoryImageUrl(slug: string, name = ''): string {
	return stockMediaPath(themeForCategory(slug, name), 'hero.jpg');
}

export function productImageUrls(slug: string, name: string, index: number): string[] {
	const theme = themeForCategory(slug, name);
	const photos = THEME_PHOTOS[theme];
	const hero = photos[0];
	const altA = photos[1 + (index % (photos.length - 1))];
	const altB = photos[1 + ((index + 1) % (photos.length - 1))];
	return [hero, altA, altB].map((photo) => stockMediaPath(theme, photo.file));
}

function unsplashUrl(id: string): string {
	return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=72`;
}

function picsumUrl(theme: string, file: string): string {
	const seed = `${theme}-${file}`.replace(/[^a-z0-9]+/gi, '-');
	return `https://picsum.photos/seed/${seed}/1400/1000`;
}

async function fileExists(path: string): Promise<boolean> {
	try {
		const info = await stat(path);
		return info.isFile() && info.size > 1024;
	}
	catch {
		return false;
	}
}

async function download(url: string, dest: string): Promise<void> {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'austenstrine-portfolio-seed/1.0 (demo catalog; royalty-free stock)',
			Accept: 'image/jpeg,image/*,*/*',
		},
		redirect: 'follow',
	});
	if(!response.ok || !response.body) {
		throw new Error(`${response.status} ${url}`);
	}
	await mkdir(dirname(dest), { recursive: true });
	const tmp = `${dest}.tmp`;
	await pipeline(Readable.fromWeb(response.body as never), createWriteStream(tmp));
	const { rename } = await import('fs/promises');
	await rename(tmp, dest);
}

export function findRepoRoot(startDir: string): string {
	let dir = startDir;
	for(let i = 0; i < 8; i += 1) {
		if(existsSync(join(dir, 'dssh')) && existsSync(join(dir, 'ops/cdn'))) {
			return dir;
		}
		dir = join(dir, '..');
	}
	return startDir;
}

export function cdnOriginDir(startDir: string): string {
	return join(findRepoRoot(startDir), 'ops/cdn/data/origin');
}

export async function ensureStockImages(originDir: string): Promise<void> {
	let downloaded = 0;
	let skipped = 0;
	for(const [theme, photos] of Object.entries(THEME_PHOTOS) as Array<[StockTheme, Photo[]]>) {
		for(const photo of photos) {
			const relative = stockMediaPath(theme, photo.file);
			const dest = join(originDir, relative.replace(/^\//, ''));
			if(await fileExists(dest)) {
				skipped += 1;
				continue;
			}
			try {
				await download(unsplashUrl(photo.id), dest);
				downloaded += 1;
			}
			catch(unsplashError) {
				try {
					await download(picsumUrl(theme, photo.file), dest);
					downloaded += 1;
					console.warn(`Unsplash failed for ${theme}/${photo.file}; used picsum fallback.`);
				}
				catch {
					console.warn(
						`Could not download ${theme}/${photo.file}: ${
							unsplashError instanceof Error ? unsplashError.message : unsplashError
						}`,
					);
				}
			}
		}
	}
	console.log(`Catalog stock images: ${downloaded} downloaded, ${skipped} already present.`);
}
