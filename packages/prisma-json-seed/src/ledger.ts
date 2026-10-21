import type { ApplyOptions } from './types';

const TABLE = '_prisma_json_seed';

export async function ensureLedger(prisma: ApplyOptions['prisma']): Promise<void> {
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS "${TABLE}" (
			"pack" TEXT PRIMARY KEY,
			"checksum" TEXT NOT NULL,
			"applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
}

export async function readLedger(
	prisma: ApplyOptions['prisma'],
	pack: string,
): Promise<{ pack: string; checksum: string } | null> {
	await ensureLedger(prisma);
	const rows = await prisma.$queryRawUnsafe<Array<{ pack: string; checksum: string }>>(
		`SELECT "pack", "checksum" FROM "${TABLE}" WHERE "pack" = $1`,
		pack,
	);
	return rows[0] ?? null;
}

export async function writeLedger(
	prisma: ApplyOptions['prisma'],
	pack: string,
	checksum: string,
): Promise<void> {
	await ensureLedger(prisma);
	await prisma.$executeRawUnsafe(
		`
			INSERT INTO "${TABLE}" ("pack", "checksum", "applied_at")
			VALUES ($1, $2, CURRENT_TIMESTAMP)
			ON CONFLICT ("pack")
			DO UPDATE SET "checksum" = EXCLUDED."checksum", "applied_at" = CURRENT_TIMESTAMP
		`,
		pack,
		checksum,
	);
}
