import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';

type AttributeSeedRow = {
	id: string;
	name: string;
	vendorId: string | null;
};

/**
 * Migration 20261022070000 inserts a global Color attribute with a random id.
 * JSON seed needs the deterministic Attribute / AttributeValue ids, so drop any
 * colliding global rows (values cascade) before upserting the pack.
 */
export async function alignJsonSeedAttributes(
	prisma: PrismaClient,
	seedDir: string,
): Promise<void> {
	const file = JSON.parse(readFileSync(join(seedDir, 'Attribute.json'), 'utf8')) as {
		records?: AttributeSeedRow[];
	};
	if(!Array.isArray(file.records)) {
		return;
	}

	for(const record of file.records) {
		if(!record.id || !record.name || record.vendorId != null) {
			continue;
		}
		await prisma.attribute.deleteMany({
			where: {
				name: record.name,
				vendorId: null,
				NOT: { id: record.id },
			},
		});
	}
}
