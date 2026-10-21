import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { findModel, identityField, loadSchema, type ModelInfo } from './dmmf';
import {
	CONFIG_FILE,
	LEGACY_META_FILE,
	listSeedFiles,
	readConfig,
	type ListedSeedFile,
} from './files';
import { readLedger, writeLedger } from './ledger';
import { flattenTree } from './tree';
import type { ApplyOptions, ApplyResult, PrismaLike, SeedFile } from './types';

export async function applySeedDataIfNeeded(options: ApplyOptions): Promise<ApplyResult> {
	return applySeedData(options);
}

export async function applySeedData(options: ApplyOptions): Promise<ApplyResult> {
	const config = readConfig(options.seedDir);
	const listed = listSeedFiles(options.seedDir, config).filter((file) => file.maintain);
	const checksum = seedChecksum(options.seedDir, listed);
	const existing = await readLedger(options.prisma, config.pack);

	if(existing?.checksum === checksum && !options.force) {
		return {
			skipped: true,
			pack: config.pack,
			upserted: 0,
		};
	}

	const schema = await loadSchema(resolve(options.seedDir, config.schema));
	const omit = new Set(config.omitFields);
	let upserted = 0;

	for(const item of listed) {
		const modelName = item.file.$prismaJsonSeed.model;
		if(!modelName) {
			continue;
		}

		const model = findModel(schema, modelName);
		if(!model) {
			throw new Error(`Seed model ${modelName} is not in schema.prisma.`);
		}

		upserted += await applyModel(options.prisma, model, item.file, omit);
	}

	await writeLedger(options.prisma, config.pack, checksum);

	return {
		skipped: false,
		pack: config.pack,
		upserted,
	};
}

async function applyModel(
	prisma: ApplyOptions['prisma'],
	model: ModelInfo,
	file: SeedFile,
	omit: Set<string>,
): Promise<number> {
	if(!Array.isArray(file.records)) {
		return 0;
	}

	const header = file.$prismaJsonSeed;
	const identity = identityField(model, header.identityField);
	if(!identity || omit.has(identity) || !canUpsertBy(model, identity)) {
		return 0;
	}

	const records = header.format === 'tree'
		? flattenTree(file.records, {
				identityField: header.identityField ?? identity,
				parentRelation: header.parentRelation ?? 'parent',
				childrenField: header.childrenField,
			})
		: file.records;

	const delegates = prisma as PrismaLike & Record<string, { upsert?: (args: unknown) => Promise<unknown> }>;
	const delegate = delegates[clientKey(model.name)];

	if(!delegate?.upsert) {
		throw new Error(`Prisma client is missing ${clientKey(model.name)}.upsert`);
	}

	const objectFields = new Set(
		model.fields.filter((field) => field.kind === 'object').map((field) => field.name),
	);
	const scalarFields = model.fields.filter((field) => field.kind !== 'object');

	for(const record of records) {
		const data: Record<string, unknown> = {};

		for(const field of scalarFields) {
			if(omit.has(field.name) || field.isId) {
				continue;
			}
			if(field.name in record) {
				data[field.name] = record[field.name];
			}
		}

		for(const relation of objectFields) {
			const value = record[relation];
			if(value && typeof value === 'object' && !Array.isArray(value)) {
				data[relation] = { connect: value };
			}
		}

		const identityValue = record[identity];
		if(identityValue == null) {
			throw new Error(`Seed row for ${model.name} is missing identity field "${identity}".`);
		}

		await delegate.upsert({
			where: { [identity]: identityValue },
			create: data,
			update: data,
		});
	}

	return records.length;
}

function canUpsertBy(model: ModelInfo, identity: string): boolean {
	const field = model.fields.find((item) => item.name === identity);
	if(!field) {
		return false;
	}
	if(field.isId || field.isUnique) {
		return true;
	}
	return model.uniqueFields.some((group) => group.length === 1 && group[0] === identity);
}

function clientKey(model: string): string {
	return model.charAt(0).toLowerCase() + model.slice(1);
}

function seedChecksum(seedDir: string, listed: ListedSeedFile[]): string {
	const hash = createHash('sha256');
	const configPath = existsSync(join(seedDir, CONFIG_FILE))
		? join(seedDir, CONFIG_FILE)
		: join(seedDir, LEGACY_META_FILE);
	if(existsSync(configPath)) {
		hash.update(readFileSync(configPath, 'utf8'));
	}
	for(const item of listed) {
		hash.update(item.filename);
		hash.update(readFileSync(item.path, 'utf8'));
	}
	return hash.digest('hex');
}
