import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { applySeedDataIfNeeded } from 'prisma-seed-migration-sync';
import { alignJsonSeedAttributes } from '../src/modules/catalog/align-json-seed-attributes';
import { seedGlobalUoms } from '../src/modules/catalog/seed-global-uoms';
import { seedCatalog } from './catalog-seed';

const prisma = new PrismaClient();

async function main() {
	const seedDir = join(__dirname, 'seed-data');
	await seedGlobalUoms(prisma);
	await alignJsonSeedAttributes(prisma, seedDir);
	await applySeedDataIfNeeded({
		prisma,
		seedDir,
	});
	await seedCatalog(prisma);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
