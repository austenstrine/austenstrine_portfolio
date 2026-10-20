import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { UomMergePolicyStatus } from '@prisma/client';
import { MailService } from '../../infra/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

type MergeAction = 'confirm' | 'skip-once' | 'skip-forever';

type CollisionGroup = {
	nameKey: string;
	uoms: Array<{
		id: string;
		code: string;
		aliases: string[];
		vendorId: string | null;
		vendorName: string | null;
		vendorSlug: string | null;
	}>;
};

@Injectable()
export class UomMergeService {
	private readonly logger = new Logger(UomMergeService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly mail: MailService,
	) {}

	normalizeAliases(aliases: string[] | undefined): string[] {
		if(!aliases?.length) {
			return [];
		}
		const seen = new Set<string>();
		const out: string[] = [];
		for(const raw of aliases) {
			const alias = raw.trim();
			if(!alias || seen.has(alias)) {
				continue;
			}
			seen.add(alias);
			out.push(alias.slice(0, 40));
		}
		return out.slice(0, 20);
	}

	nameKeysFor(code: string, aliases: string[]): string[] {
		const keys = [code, ...aliases];
		const seen = new Set<string>();
		const out: string[] = [];
		for(const key of keys) {
			if(!key || seen.has(key)) {
				continue;
			}
			seen.add(key);
			out.push(key);
		}
		return out;
	}

	/**
	 * After a vendor UOM is created/updated, detect cross-vendor collisions and email automerge@.
	 */
	async evaluateAfterVendorUomChange(uomId: string): Promise<void> {
		const uom = await this.prisma.unitOfMeasure.findUnique({
			where: { id: uomId },
			include: { vendor: { select: { id: true, name: true, slug: true } } },
		});
		if(!uom || !uom.vendorId) {
			return;
		}

		const keys = this.nameKeysFor(uom.code, uom.aliases);
		for(const nameKey of keys) {
			await this.evaluateNameKey(nameKey);
		}
	}

	async evaluateNameKey(nameKey: string): Promise<void> {
		const group = await this.findCollisionGroup(nameKey);
		const vendorOwned = group.uoms.filter((row) => row.vendorId);
		if(vendorOwned.length < 2) {
			return;
		}

		// Distinct vendors required
		const vendorIds = new Set(vendorOwned.map((row) => row.vendorId));
		if(vendorIds.size < 2) {
			return;
		}

		const policy = await this.prisma.uomMergePolicy.findUnique({
			where: { nameKey },
		});

		const collidingIds = vendorOwned.map((row) => row.id).sort();

		if(policy?.status === UomMergePolicyStatus.SKIP_FOREVER) {
			return;
		}
		if(policy?.status === UomMergePolicyStatus.MERGED) {
			return;
		}
		if(policy?.status === UomMergePolicyStatus.SKIP_ONCE) {
			const previous = new Set(policy.lastNotifiedUomIds);
			const hasNew = collidingIds.some((id) => !previous.has(id));
			if(!hasNew) {
				return;
			}
		}

		await this.sendAutomergeEmail(group);
		await this.prisma.uomMergePolicy.upsert({
			where: { nameKey },
			create: {
				nameKey,
				status: UomMergePolicyStatus.SKIP_ONCE,
				lastNotifiedUomIds: collidingIds,
			},
			update: {
				status: UomMergePolicyStatus.SKIP_ONCE,
				lastNotifiedUomIds: collidingIds,
			},
		});
	}

	async findCollisionGroup(nameKey: string): Promise<CollisionGroup> {
		const rows = await this.prisma.unitOfMeasure.findMany({
			where: {
				OR: [
					{ code: nameKey },
					{ aliases: { has: nameKey } },
				],
			},
			include: {
				vendor: { select: { id: true, name: true, slug: true } },
			},
			orderBy: { createdAt: 'asc' },
		});

		return {
			nameKey,
			uoms: rows.map((row) => ({
				id: row.id,
				code: row.code,
				aliases: row.aliases,
				vendorId: row.vendorId,
				vendorName: row.vendor?.name ?? null,
				vendorSlug: row.vendor?.slug ?? null,
			})),
		};
	}

	signToken(action: MergeAction, nameKey: string): string {
		const secret = this.signingSecret();
		const payload = `${action}:${nameKey}`;
		const sig = createHmac('sha256', secret).update(payload).digest('hex');
		return Buffer.from(JSON.stringify({ action, nameKey, sig })).toString('base64url');
	}

	parseToken(token: string): { action: MergeAction; nameKey: string } {
		let parsed: { action?: string; nameKey?: string; sig?: string };
		try {
			parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
				action?: string;
				nameKey?: string;
				sig?: string;
			};
		}
		catch {
			throw new BadRequestException('Invalid merge token.');
		}

		const action = parsed.action as MergeAction | undefined;
		const nameKey = parsed.nameKey;
		const sig = parsed.sig;
		if(
			!action
			|| !nameKey
			|| !sig
			|| !['confirm', 'skip-once', 'skip-forever'].includes(action)
		) {
			throw new BadRequestException('Invalid merge token.');
		}

		const expected = createHmac('sha256', this.signingSecret())
			.update(`${action}:${nameKey}`)
			.digest('hex');
		const a = Buffer.from(sig);
		const b = Buffer.from(expected);
		if(a.length !== b.length || !timingSafeEqual(a, b)) {
			throw new BadRequestException('Invalid or tampered merge token.');
		}

		return { action, nameKey };
	}

	async handleToken(token: string): Promise<{ message: string; action: MergeAction; nameKey: string }> {
		const { action, nameKey } = this.parseToken(token);
		if(action === 'confirm') {
			await this.confirmMerge(nameKey);
			return {
				action,
				nameKey,
				message: `Merged vendor UOMs for "${nameKey}" into a global unit.`,
			};
		}
		if(action === 'skip-once') {
			const group = await this.findCollisionGroup(nameKey);
			const ids = group.uoms.filter((row) => row.vendorId).map((row) => row.id).sort();
			await this.prisma.uomMergePolicy.upsert({
				where: { nameKey },
				create: {
					nameKey,
					status: UomMergePolicyStatus.SKIP_ONCE,
					lastNotifiedUomIds: ids,
				},
				update: {
					status: UomMergePolicyStatus.SKIP_ONCE,
					lastNotifiedUomIds: ids,
				},
			});
			return {
				action,
				nameKey,
				message: `Skipped merge for "${nameKey}" until another colliding UOM is created.`,
			};
		}

		await this.prisma.uomMergePolicy.upsert({
			where: { nameKey },
			create: {
				nameKey,
				status: UomMergePolicyStatus.SKIP_FOREVER,
				lastNotifiedUomIds: [],
			},
			update: {
				status: UomMergePolicyStatus.SKIP_FOREVER,
			},
		});
		return {
			action,
			nameKey,
			message: `Will never prompt to merge UOMs named "${nameKey}" again.`,
		};
	}

	async confirmMerge(nameKey: string): Promise<void> {
		const group = await this.findCollisionGroup(nameKey);
		const vendorUoms = group.uoms.filter((row) => row.vendorId);
		if(vendorUoms.length < 2) {
			throw new NotFoundException('No multi-vendor collision found for that name.');
		}

		const existingGlobal = group.uoms.find((row) => !row.vendorId);
		const aliasUnion = new Set<string>();
		for(const row of vendorUoms) {
			for(const alias of row.aliases) {
				if(alias !== nameKey) {
					aliasUnion.add(alias);
				}
			}
			if(row.code !== nameKey) {
				aliasUnion.add(row.code);
			}
		}
		if(existingGlobal) {
			for(const alias of existingGlobal.aliases) {
				aliasUnion.add(alias);
			}
			if(existingGlobal.code !== nameKey) {
				aliasUnion.add(existingGlobal.code);
			}
		}
		aliasUnion.delete(nameKey);

		const primaryVendor = vendorUoms[0];
		const source = await this.prisma.unitOfMeasure.findUniqueOrThrow({
			where: { id: primaryVendor.id },
		});

		const global = await this.prisma.$transaction(async (tx) => {
			let globalRow = existingGlobal
				? await tx.unitOfMeasure.findUniqueOrThrow({ where: { id: existingGlobal.id } })
				: await tx.unitOfMeasure.create({
						data: {
							code: nameKey,
							label: source.label,
							dimensionKey: source.dimensionKey,
							factorToReference: source.factorToReference,
							aliases: [...aliasUnion],
							vendorId: null,
							metadata: source.metadata ?? undefined,
						},
					});

			if(existingGlobal) {
				globalRow = await tx.unitOfMeasure.update({
					where: { id: globalRow.id },
					data: {
						aliases: [...aliasUnion],
					},
				});
			}

			const duplicateIds = vendorUoms.map((row) => row.id);
			await tx.productOffering.updateMany({
				where: { uomId: { in: duplicateIds } },
				data: { uomId: globalRow.id },
			});

			await tx.unitOfMeasure.deleteMany({
				where: { id: { in: duplicateIds } },
			});

			await tx.uomMergePolicy.upsert({
				where: { nameKey },
				create: {
					nameKey,
					status: UomMergePolicyStatus.MERGED,
					lastNotifiedUomIds: [],
				},
				update: {
					status: UomMergePolicyStatus.MERGED,
					lastNotifiedUomIds: [],
				},
			});

			return globalRow;
		});

		this.logger.log(`Merged UOMs for "${nameKey}" into global ${global.id}`);
	}

	private async sendAutomergeEmail(group: CollisionGroup): Promise<void> {
		const to = process.env.UOM_AUTOMERGE_EMAIL ?? 'automerge@austenstrine.dev';
		const apiBase = process.env.API_PUBLIC_URL
			?? process.env.WEB_URL?.replace(/:\d+$/, ':3001')
			?? 'http://localhost:3001';
		const webBase = process.env.WEB_URL ?? 'http://localhost:3000';

		const confirmToken = this.signToken('confirm', group.nameKey);
		const skipOnceToken = this.signToken('skip-once', group.nameKey);
		const skipForeverToken = this.signToken('skip-forever', group.nameKey);

		const confirmUrl = `${webBase}/shop/uom-merges?token=${encodeURIComponent(confirmToken)}`;
		const skipOnceUrl = `${webBase}/shop/uom-merges?token=${encodeURIComponent(skipOnceToken)}`;
		const skipForeverUrl = `${webBase}/shop/uom-merges?token=${encodeURIComponent(skipForeverToken)}`;

		// Keep API token routes as well for email clients that prefer direct API hits
		void apiBase;

		const lines = group.uoms.map((row) => {
			const owner = row.vendorId
				? `${row.vendorName} (/shop/${row.vendorSlug})`
				: 'GLOBAL';
			const aliases = row.aliases.length ? ` aliases=[${row.aliases.join(', ')}]` : '';
			return `- ${owner}: code="${row.code}"${aliases} id=${row.id}`;
		});

		const text = [
			`Cross-vendor UOM collision on name key "${group.nameKey}"`,
			'',
			'Matching units:',
			...lines,
			'',
			`Confirm merge (promote global, re-point offerings, delete duplicates):`,
			confirmUrl,
			'',
			`Skip for now (ask again if another colliding UOM is created):`,
			skipOnceUrl,
			'',
			`Skip forever (never ask again for this name key):`,
			skipForeverUrl,
		].join('\n');

		await this.mail.sendMailWithAttachment({
			to,
			subject: `UOM automerge: "${group.nameKey}"`,
			text,
			html: `<pre style="font-family:inherit;white-space:pre-wrap;">${text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')}</pre>`,
		});
	}

	private signingSecret(): string {
		const secret = process.env.UOM_MERGE_SIGNING_SECRET
			?? process.env.JWT_ACCESS_SECRET
			?? process.env.JWT_REFRESH_SECRET;
		if(!secret) {
			throw new Error('UOM merge signing secret is not configured.');
		}
		return secret;
	}
}
