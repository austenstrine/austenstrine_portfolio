import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import { applySeedDataIfNeeded } from 'prisma-seed-migration-sync';

export function jsonSeedDir(): string {
	return join(__dirname, '../../../prisma/seed-data');
}

export async function applyJsonSeedIfNeeded(prisma: PrismaClient) {
	return applySeedDataIfNeeded({
		prisma,
		seedDir: jsonSeedDir(),
	});
}
