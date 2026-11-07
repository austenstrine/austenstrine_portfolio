import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

const ASSIGNABLE_ROLES: VendorMemberRole[] = [
	VendorMemberRole.EDITOR,
	VendorMemberRole.VIEWER,
];

@Injectable()
export class VendorMemberService {
	constructor(private readonly prisma: PrismaService) {}

	async updateMemberRole(
		actorUserId: string,
		vendorId: string,
		memberUserId: string,
		role: VendorMemberRole,
	) {
		await this.assertOwner(actorUserId, vendorId);

		if(!ASSIGNABLE_ROLES.includes(role)) {
			throw new BadRequestException('Role must be Editor or Viewer.');
		}

		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: {
					vendorId,
					userId: memberUserId,
				},
			},
			include: {
				user: { select: { id: true, email: true } },
			},
		});
		if(!membership) {
			throw new NotFoundException('Member not found.');
		}

		if(membership.role === VendorMemberRole.OWNER) {
			await this.assertNotLastOwner(vendorId);
		}

		const updated = await this.prisma.vendorMember.update({
			where: { id: membership.id },
			data: { role },
			include: {
				user: { select: { id: true, email: true } },
			},
		});

		return this.toMemberSummary(updated);
	}

	async removeMember(
		actorUserId: string,
		vendorId: string,
		memberUserId: string,
	) {
		await this.assertOwner(actorUserId, vendorId);

		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: {
					vendorId,
					userId: memberUserId,
				},
			},
		});
		if(!membership) {
			throw new NotFoundException('Member not found.');
		}

		if(membership.role === VendorMemberRole.OWNER) {
			await this.assertNotLastOwner(vendorId);
		}

		await this.prisma.vendorMember.delete({
			where: { id: membership.id },
		});

		return { message: 'Member removed.' };
	}

	private async assertOwner(userId: string, vendorId: string) {
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: {
					vendorId,
					userId,
				},
			},
		});
		if(!membership || membership.role !== VendorMemberRole.OWNER) {
			throw new ForbiddenException(
				'Only an organization owner can change members.',
			);
		}
	}

	private async assertNotLastOwner(vendorId: string) {
		const ownerCount = await this.prisma.vendorMember.count({
			where: {
				vendorId,
				role: VendorMemberRole.OWNER,
			},
		});
		if(ownerCount <= 1) {
			throw new BadRequestException(
				'Add another owner before changing or removing the last owner.',
			);
		}
	}

	private toMemberSummary(membership: {
		user: { id: string; email: string };
		role: VendorMemberRole;
		createdAt: Date;
	}) {
		return {
			userId: membership.user.id,
			email: membership.user.email,
			role: membership.role,
			joinedAt: membership.createdAt,
		};
	}
}
