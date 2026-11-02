import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type UomSeedRow = {
	code: string;
	label: string;
	dimensionKey: string;
	factorToReference: string;
	aliases: string[];
	omitFromAvailability?: boolean;
};

export async function seedGlobalUoms(prisma: PrismaClient): Promise<void> {
	const file = JSON.parse(
		readFileSync(join(__dirname, '../../../prisma/seed-data/UnitOfMeasure.json'), 'utf8'),
	) as { records?: UomSeedRow[] };
	if(!Array.isArray(file.records)) {
		throw new Error('UnitOfMeasure.json is missing records[].');
	}

	for(const row of file.records) {
		const existing = await prisma.unitOfMeasure.findFirst({
			where: { vendorId: null, code: row.code },
		});
		const omitFromAvailability = row.omitFromAvailability === true;
		if(existing) {
			await prisma.unitOfMeasure.update({
				where: { id: existing.id },
				data: {
					label: row.label,
					dimensionKey: row.dimensionKey,
					factorToReference: new Decimal(row.factorToReference),
					aliases: row.aliases,
					omitFromAvailability,
					vendorId: null,
				},
			});
		}
		else {
			await prisma.unitOfMeasure.create({
				data: {
					code: row.code,
					label: row.label,
					dimensionKey: row.dimensionKey,
					factorToReference: new Decimal(row.factorToReference),
					aliases: row.aliases,
					omitFromAvailability,
					vendorId: null,
				},
			});
		}
	}
}
