import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const projects = [
		{
			title: 'ProPortals Inventory System',
			slug: 'proportals-inventory-system',
			summary:
				'Built the inventory management system from concept to production and cleared webpack build issues that were blocking release, helping the team hit its deadline.',
			description:
				'End-to-end delivery of core inventory management features, including technical triage on release-blocking build problems.',
			tags: ['NestJS', 'TypeScript', 'PostgreSQL', 'Webpack'],
			featured: true,
		},
		{
			title: 'Regex Synthesis Engine',
			slug: 'regex-synthesis-engine',
			summary:
				'Built a custom, industry-specific regex synthesis engine and library for textual data processing, inventory upload, and keyword harvesting.',
			description:
				'Proprietary tooling to automate extraction and structuring of domain-specific inventory text in the lumber space.',
			tags: ['Node.js', 'Regex', 'Search', 'Automation'],
			featured: true,
		},
		{
			title: 'Prisma Code Generators',
			slug: 'prisma-code-generators',
			summary:
				'Built automated generators that synthesize class suites for Prisma models with class-validator, class-transformer, and Swagger integration.',
			description:
				'Reduced repetitive implementation and maintenance overhead for DTOs and entity classes across services.',
			tags: ['Prisma', 'Swagger', 'NestJS', 'Codegen'],
			featured: true,
		},
	];

	for(const project of projects) {
		await prisma.project.upsert({
			where: { slug: project.slug },
			create: project,
			update: project,
		});
	}
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
