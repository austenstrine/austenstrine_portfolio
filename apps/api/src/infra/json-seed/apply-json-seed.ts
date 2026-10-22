import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import { applySeedDataIfNeeded } from 'prisma-seed-migration-sync';
import { seedGlobalUoms } from '../../modules/catalog/seed-global-uoms';

export function jsonSeedDir(): string {
	return join(__dirname, '../../../prisma/seed-data');
}

export async function applyJsonSeedIfNeeded(prisma: PrismaClient) {
	await seedGlobalUoms(prisma);
	return applySeedDataIfNeeded({
		prisma,
		seedDir: jsonSeedDir(),
	});
}
