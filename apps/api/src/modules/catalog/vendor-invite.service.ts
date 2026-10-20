import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MailService } from '../../infra/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { VendorAccessService } from './vendor-access.service';

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const INVITABLE_ROLES: VendorMemberRole[] = [
	VendorMemberRole.EDITOR,
	VendorMemberRole.VIEWER,
];

@Injectable()
export class VendorInviteService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
		private readonly mail: MailService,
	) {}

	async createInvite(
		actorUserId: string,
		vendorId: string,
		emailRaw: string,
		role: VendorMemberRole = VendorMemberRole.EDITOR,
	) {
		await this.vendorAccess.assertCanEditVendor(actorUserId, vendorId);

		if(role === VendorMemberRole.OWNER || !INVITABLE_ROLES.includes(role)) {
			throw new BadRequestException('Invites can only grant EDITOR or VIEWER roles.');
		}

		const email = emailRaw.trim().toLowerCase();
		const vendor = await this.prisma.vendor.findUnique({
			where: { id: vendorId },
			select: { id: true, name: true, slug: true },
		});
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		const existingMember = await this.prisma.vendorMember.findFirst({
			where: {
				vendorId,
				user: { email },
			},
		});
		if(existingMember) {
			throw new ConflictException('That user is already a member of this vendor.');
		}

		const pending = await this.prisma.vendorInvite.findFirst({
			where: {
				vendorId,
				email,
				acceptedAt: null,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
		});
		if(pending) {
			throw new ConflictException('An open invite already exists for that email.');
		}

		const token = randomBytes(32).toString('hex');
		const invite = await this.prisma.vendorInvite.create({
			data: {
				vendorId,
				email,
				role,
				token,
				invitedByUserId: actorUserId,
				expiresAt: new Date(Date.now() + INVITE_TTL_MS),
			},
		});

		const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
		const acceptUrl = `${webUrl}/place-et-marque/invites/accept?token=${encodeURIComponent(token)}`;

		await this.mail.sendMailWithAttachment({
			to: email,
			subject: `You're invited to join ${vendor.name} on Place et Marque`,
			text: [
				`You've been invited to join ${vendor.name} as ${role}.`,
				'',
				`Accept the invite: ${acceptUrl}`,
				'',
				'This link expires in 14 days. If you did not expect this, you can ignore this email.',
			].join('\n'),
			html: `
				<p>You've been invited to join <strong>${vendor.name}</strong> as <strong>${role}</strong>.</p>
				<p><a href="${acceptUrl}">Accept the invite</a></p>
				<p>This link expires in 14 days. If you did not expect this, you can ignore this email.</p>
			`,
		});

		return this.toInviteSummary(invite);
	}

	async listInvites(actorUserId: string, vendorId: string) {
		await this.vendorAccess.assertCanEditVendor(actorUserId, vendorId);

		const invites = await this.prisma.vendorInvite.findMany({
			where: {
				vendorId,
				acceptedAt: null,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
			orderBy: { createdAt: 'desc' },
		});

		return invites.map((invite) => this.toInviteSummary(invite));
	}

	async revokeInvite(actorUserId: string, vendorId: string, inviteId: string) {
		await this.vendorAccess.assertCanEditVendor(actorUserId, vendorId);

		const invite = await this.prisma.vendorInvite.findFirst({
			where: { id: inviteId, vendorId },
		});
		if(!invite) {
			throw new NotFoundException('Invite not found.');
		}
		if(invite.acceptedAt || invite.revokedAt) {
			throw new BadRequestException('That invite is no longer open.');
		}

		await this.prisma.vendorInvite.update({
			where: { id: inviteId },
			data: { revokedAt: new Date() },
		});

		return { message: 'Invite revoked.' };
	}

	async acceptInvite(userId: string, userEmail: string, token: string) {
		const invite = await this.prisma.vendorInvite.findUnique({
			where: { token },
			include: {
				vendor: { select: { id: true, name: true, slug: true } },
			},
		});

		if(!invite || invite.revokedAt) {
			throw new NotFoundException('Invite not found or has been revoked.');
		}
		if(invite.acceptedAt) {
			throw new ConflictException('This invite has already been accepted.');
		}
		if(invite.expiresAt.getTime() < Date.now()) {
			throw new BadRequestException('This invite has expired.');
		}

		const normalizedUserEmail = userEmail.trim().toLowerCase();
		if(normalizedUserEmail !== invite.email) {
			throw new ForbiddenException(
				`Sign in as ${invite.email} to accept this invite.`,
			);
		}

		const existing = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: {
					vendorId: invite.vendorId,
					userId,
				},
			},
		});
		if(existing) {
			await this.prisma.vendorInvite.update({
				where: { id: invite.id },
				data: { acceptedAt: new Date() },
			});
			return {
				vendorId: invite.vendor.id,
				vendorName: invite.vendor.name,
				vendorSlug: invite.vendor.slug,
				role: existing.role,
				alreadyMember: true,
			};
		}

		const [membership] = await this.prisma.$transaction([
			this.prisma.vendorMember.create({
				data: {
					vendorId: invite.vendorId,
					userId,
					role: invite.role,
				},
			}),
			this.prisma.vendorInvite.update({
				where: { id: invite.id },
				data: { acceptedAt: new Date() },
			}),
		]);

		return {
			vendorId: invite.vendor.id,
			vendorName: invite.vendor.name,
			vendorSlug: invite.vendor.slug,
			role: membership.role,
			alreadyMember: false,
		};
	}

	async peekInvite(token: string) {
		const invite = await this.prisma.vendorInvite.findUnique({
			where: { token },
			include: {
				vendor: { select: { id: true, name: true, slug: true } },
			},
		});

		if(!invite || invite.revokedAt) {
			throw new NotFoundException('Invite not found or has been revoked.');
		}
		if(invite.acceptedAt) {
			throw new ConflictException('This invite has already been accepted.');
		}
		if(invite.expiresAt.getTime() < Date.now()) {
			throw new BadRequestException('This invite has expired.');
		}

		return {
			email: invite.email,
			role: invite.role,
			expiresAt: invite.expiresAt,
			vendorName: invite.vendor.name,
			vendorSlug: invite.vendor.slug,
		};
	}

	private toInviteSummary(invite: {
		id: string;
		email: string;
		role: VendorMemberRole;
		expiresAt: Date;
		createdAt: Date;
	}) {
		return {
			id: invite.id,
			email: invite.email,
			role: invite.role,
			expiresAt: invite.expiresAt,
			createdAt: invite.createdAt,
		};
	}
}
