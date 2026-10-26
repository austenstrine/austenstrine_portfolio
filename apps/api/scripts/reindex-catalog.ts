import '../src/load-env';
import { OpenSearchService } from '../src/infra/opensearch/opensearch.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { CatalogSearchService } from '../src/modules/catalog/search/catalog-search.service';

async function main(): Promise<void> {
	const prisma = new PrismaService();
	await prisma.$connect();
	try {
		const search = new CatalogSearchService(prisma, new OpenSearchService());
		await search.reindexAll();
	}
	finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
