import {
	BadRequestException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { VendorMemberService } from './vendor-member.service';

describe('VendorMemberService', () => {
	function buildService(opts?: {
		actorRole?: VendorMemberRole | null;
		target?: {
			id: string;
			role: VendorMemberRole;
			userId: string;
			email: string;
		} | null;
		ownerCount?: number;
	}) {
		const actorRole = opts?.actorRole === undefined
			? VendorMemberRole.OWNER
			: opts.actorRole;
		const target = opts?.target === undefined
			? {
					id: 'mem_editor',
					role: VendorMemberRole.EDITOR,
					userId: 'user_editor',
					email: 'editor@example.com',
				}
			: opts.target;
		const ownerCount = opts?.ownerCount ?? 2;

		const prisma = {
			vendorMember: {
				findUnique: jest.fn().mockImplementation(
					async (args: {
						where?: {
							vendorId_userId?: { userId: string };
						};
					}) => {
						const userId = args.where?.vendorId_userId?.userId;
						if(userId === 'actor') {
							return actorRole
								? { role: actorRole }
								: null;
						}
						if(userId === target?.userId) {
							return target
								? {
										id: target.id,
										role: target.role,
										user: { id: target.userId, email: target.email },
									}
								: null;
						}
						return null;
					},
				),
				count: jest.fn().mockResolvedValue(ownerCount),
				update: jest.fn().mockImplementation(async ({ data }: { data: { role: VendorMemberRole } }) => ({
					user: { id: target!.userId, email: target!.email },
					role: data.role,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				})),
				delete: jest.fn().mockResolvedValue({}),
			},
		};

		const service = new VendorMemberService(prisma as never);
		return { service, prisma, target };
	}

	it('lets an owner change editor to viewer', async () => {
		const { service, prisma } = buildService();
		const result = await service.updateMemberRole(
			'actor',
			'vendor_1',
			'user_editor',
			VendorMemberRole.VIEWER,
		);
		expect(result.role).toBe(VendorMemberRole.VIEWER);
		expect(prisma.vendorMember.update).toHaveBeenCalled();
	});

	it('rejects non-owners', async () => {
		const { service } = buildService({ actorRole: VendorMemberRole.EDITOR });
		await expect(
			service.updateMemberRole(
				'actor',
				'vendor_1',
				'user_editor',
				VendorMemberRole.VIEWER,
			),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('rejects assigning OWNER', async () => {
		const { service } = buildService();
		await expect(
			service.updateMemberRole(
				'actor',
				'vendor_1',
				'user_editor',
				VendorMemberRole.OWNER,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('blocks demoting the last owner', async () => {
		const { service } = buildService({
			target: {
				id: 'mem_owner',
				role: VendorMemberRole.OWNER,
				userId: 'user_owner',
				email: 'owner@example.com',
			},
			ownerCount: 1,
		});
		await expect(
			service.updateMemberRole(
				'actor',
				'vendor_1',
				'user_owner',
				VendorMemberRole.EDITOR,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('removes a non-owner member', async () => {
		const { service, prisma } = buildService();
		const result = await service.removeMember(
			'actor',
			'vendor_1',
			'user_editor',
		);
		expect(result.message).toBe('Member removed.');
		expect(prisma.vendorMember.delete).toHaveBeenCalled();
	});

	it('404s when member is missing', async () => {
		const { service } = buildService({ target: null });
		await expect(
			service.removeMember('actor', 'vendor_1', 'missing'),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
