import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import { applySeedDataIfNeeded, type SeedApplyStore } from 'prisma-seed-migration-sync';
import { alignJsonSeedAttributes } from '../../modules/catalog/align-json-seed-attributes';
import { cdnOriginDir, ensureStockImages } from '../../modules/catalog/catalog-stock-images';
import { seedGlobalUoms } from '../../modules/catalog/seed-global-uoms';

export function jsonSeedDir(): string {
	return join(__dirname, '../../../prisma/seed-data');
}

export async function applyJsonSeedIfNeeded(
	prisma: PrismaClient,
	store?: SeedApplyStore,
) {
	const seedDir = jsonSeedDir();
	await ensureStockImages(cdnOriginDir(__dirname)).catch((error) => {
		console.warn(
			`Catalog stock images skipped: ${error instanceof Error ? error.message : error}`,
		);
	});
	await seedGlobalUoms(prisma);
	await alignJsonSeedAttributes(prisma, seedDir);
	return applySeedDataIfNeeded({
		prisma,
		seedDir,
		store,
	});
}
