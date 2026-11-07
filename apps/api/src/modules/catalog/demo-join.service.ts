import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MailService } from '../../infra/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SUPERVENDOR_ADMIN_EMAIL } from './ensure-supervendor';

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const DEMO_JOIN_ROLE = VendorMemberRole.EDITOR;

type DemoVendorSeed = {
	id: string;
	slug: string;
	name: string;
};

@Injectable()
export class DemoJoinService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly mail: MailService,
	) {}

	async getDemoInfo() {
		const vendor = await this.resolveDemoVendor();
		return {
			vendorId: vendor.id,
			vendorName: vendor.name,
			vendorSlug: vendor.slug,
			role: DEMO_JOIN_ROLE,
			description:
				'Join Demo Supply Co. as an Editor. Explore products, orders, and members.',
		};
	}

	/**
	 * Mint (or reuse) a real VendorInvite into the seeded demo vendor.
	 * Visitors then register / sign in and accept via the normal invite path.
	 *
	 * The raw invite token is never returned to the client — delivery is email
	 * only. Accept remains single-use via VendorInvite.acceptedAt.
	 */
	async joinDemo(emailRaw: string) {
		const email = emailRaw.trim().toLowerCase();
		if(!email || !email.includes('@')) {
			throw new BadRequestException('A valid email is required.');
		}

		const vendor = await this.resolveDemoVendor();
		const owner = await this.resolveDemoOwner(vendor.id);

		const existingMember = await this.prisma.vendorMember.findFirst({
			where: {
				vendorId: vendor.id,
				user: { email },
			},
		});
		if(existingMember) {
			return {
				alreadyMember: true as const,
				vendorId: vendor.id,
				vendorName: vendor.name,
				vendorSlug: vendor.slug,
				role: existingMember.role,
				email,
				mailSent: false,
				expiresAt: null,
			};
		}

		const pending = await this.prisma.vendorInvite.findFirst({
			where: {
				vendorId: vendor.id,
				email,
				acceptedAt: null,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
			orderBy: { createdAt: 'desc' },
		});

		let token: string;
		let expiresAt: Date;
		if(pending) {
			token = pending.token;
			expiresAt = pending.expiresAt;
		}
		else {
			token = randomBytes(32).toString('hex');
			expiresAt = new Date(Date.now() + INVITE_TTL_MS);
			await this.prisma.vendorInvite.create({
				data: {
					vendorId: vendor.id,
					email,
					role: DEMO_JOIN_ROLE,
					token,
					invitedByUserId: owner.id,
					expiresAt,
				},
			});
		}

		const mailSent = await this.sendInviteMail(vendor, email, token);

		return {
			alreadyMember: false as const,
			vendorId: vendor.id,
			vendorName: vendor.name,
			vendorSlug: vendor.slug,
			role: DEMO_JOIN_ROLE,
			email,
			mailSent,
			expiresAt,
		};
	}

	private async sendInviteMail(
		vendor: { name: string },
		email: string,
		token: string,
	): Promise<boolean> {
		const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
		const acceptUrl = `${webUrl}/place-et-marque/invites/accept?token=${encodeURIComponent(token)}`;

		try {
			await this.mail.sendMailWithAttachment({
				to: email,
				subject: `You're invited to join ${vendor.name} on Place et Marque`,
				text: [
					`You've been invited to join ${vendor.name} as ${DEMO_JOIN_ROLE}.`,
					'',
					`Accept the invite: ${acceptUrl}`,
					'',
					'This link expires in 14 days. If you did not expect this, you can ignore this email.',
				].join('\n'),
				html: `
					<p>You've been invited to join <strong>${vendor.name}</strong> as <strong>${DEMO_JOIN_ROLE}</strong>.</p>
					<p><a href="${acceptUrl}">Accept the invite</a></p>
					<p>This link expires in 14 days. If you did not expect this, you can ignore this email.</p>
				`,
			});
			return true;
		}
		catch {
			// Do not fall back to returning the raw token in the API body.
			return false;
		}
	}

	private demoVendorSeed(): DemoVendorSeed {
		const seedDir = join(__dirname, '../../../prisma/seed-data');
		const file = JSON.parse(
			readFileSync(join(seedDir, 'Vendor.json'), 'utf8'),
		) as { records?: Array<DemoVendorSeed> };
		const row = file.records?.[0];
		if(!row?.id || !row.slug || !row.name) {
			throw new NotFoundException('Demo vendor seed is missing.');
		}
		return row;
	}

	private async resolveDemoVendor() {
		const seed = this.demoVendorSeed();
		const vendor = await this.prisma.vendor.findUnique({
			where: { slug: seed.slug },
			select: { id: true, name: true, slug: true },
		});
		if(!vendor) {
			throw new NotFoundException(
				'Demo vendor is not seeded yet. Run prisma seed, then try again.',
			);
		}
		return vendor;
	}

	private async resolveDemoOwner(vendorId: string) {
		const ownerMember = await this.prisma.vendorMember.findFirst({
			where: {
				vendorId,
				role: VendorMemberRole.OWNER,
			},
			include: {
				user: { select: { id: true, email: true } },
			},
			orderBy: { createdAt: 'asc' },
		});
		if(ownerMember) {
			return ownerMember.user;
		}

		const admin = await this.prisma.user.findUnique({
			where: { email: SUPERVENDOR_ADMIN_EMAIL },
			select: { id: true, email: true },
		});
		if(!admin) {
			throw new NotFoundException(
				'Demo vendor has no owner. Run prisma seed, then try again.',
			);
		}

		await this.prisma.vendorMember.create({
			data: {
				vendorId,
				userId: admin.id,
				role: VendorMemberRole.OWNER,
			},
		});
		return admin;
	}
}
