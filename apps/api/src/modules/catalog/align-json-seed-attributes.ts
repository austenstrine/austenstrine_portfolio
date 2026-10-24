import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';

type AttributeSeedRow = {
	id: string;
	name: string;
	vendorId: string | null;
};

type AttributeValueSeedRow = {
	id: string;
	vendorId?: string | null;
	vendor?: { id?: string; slug?: string };
};

/**
 * Drop leftover global attributes (including case-only duplicates like gauge/Gauge)
 * and vendor values that are not in the JSON pack, so apply can upsert the
 * deterministic ids.
 */
export async function alignJsonSeedAttributes(
	prisma: PrismaClient,
	seedDir: string,
): Promise<void> {
	const attributes = JSON.parse(readFileSync(join(seedDir, 'Attribute.json'), 'utf8')) as {
		records?: AttributeSeedRow[];
	};
	if(Array.isArray(attributes.records)) {
		for(const record of attributes.records) {
			if(!record.id || !record.name || record.vendorId != null) {
				continue;
			}
			await prisma.attribute.deleteMany({
				where: {
					vendorId: null,
					name: { equals: record.name, mode: 'insensitive' },
					NOT: { id: record.id },
				},
			});
		}
	}

	const values = JSON.parse(readFileSync(join(seedDir, 'AttributeValue.json'), 'utf8')) as {
		records?: AttributeValueSeedRow[];
	};
	const keepVendorValueIds = (values.records ?? [])
		.filter((row) => row.id && (row.vendorId != null || row.vendor != null))
		.map((row) => row.id);
	await prisma.attributeValue.deleteMany({
		where: {
			vendorId: { not: null },
			...(keepVendorValueIds.length > 0 ? { id: { notIn: keepVendorValueIds } } : {}),
		},
	});
}
