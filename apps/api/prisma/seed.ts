import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { applySeedDataIfNeeded } from 'prisma-seed-migration-sync';
import { seedCatalog } from './catalog-seed';

const prisma = new PrismaClient();

async function main() {
	await seedCatalog(prisma);
	await applySeedDataIfNeeded({
		prisma,
		seedDir: join(__dirname, 'seed-data'),
	});
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
