import { ForbiddenException } from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { VendorAccessService } from './vendor-access.service';

describe('VendorAccessService seller gates', () => {
	function buildService(role: VendorMemberRole | null) {
		const prisma = {
			vendorMember: {
				findUnique: jest.fn().mockResolvedValue(
					role ? { role } : null,
				),
				findFirst: jest.fn().mockResolvedValue(null),
			},
			catalogProduct: {
				findUnique: jest.fn().mockResolvedValue({ vendorId: 'vendor_1' }),
			},
		};
		const service = new VendorAccessService(prisma as never);
		return { service, prisma };
	}

	it('lets OWNER and EDITOR manage a vendor', async () => {
		for(const role of [VendorMemberRole.OWNER, VendorMemberRole.EDITOR]) {
			const { service } = buildService(role);
			await expect(
				service.assertCanEditVendor('user_1', 'vendor_1'),
			).resolves.toBeUndefined();
		}
	});

	it('blocks VIEWER and non-members from managing a vendor', async () => {
		const viewer = buildService(VendorMemberRole.VIEWER);
		await expect(
			viewer.service.assertCanEditVendor('user_1', 'vendor_1'),
		).rejects.toBeInstanceOf(ForbiddenException);

		const stranger = buildService(null);
		await expect(
			stranger.service.assertCanEditVendor('user_1', 'vendor_1'),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('scopes app-password actors to their vendor', async () => {
		const { service, prisma } = buildService(VendorMemberRole.OWNER);

		await expect(
			service.assertActorCanEditVendor(
				{
					kind: 'app_password',
					vendorId: 'vendor_1',
					passwordId: 'ap_1',
					createdByUserId: 'user_1',
				},
				'vendor_1',
			),
		).resolves.toBeUndefined();
		expect(prisma.vendorMember.findUnique).not.toHaveBeenCalled();

		await expect(
			service.assertActorCanEditVendor(
				{
					kind: 'app_password',
					vendorId: 'vendor_1',
					passwordId: 'ap_1',
					createdByUserId: 'user_1',
				},
				'vendor_other',
			),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('requires an editor role to edit a product', async () => {
		const editor = buildService(VendorMemberRole.EDITOR);
		await expect(
			editor.service.assertCanEditProduct('user_1', 'prod_1'),
		).resolves.toBeUndefined();

		const viewer = buildService(VendorMemberRole.VIEWER);
		await expect(
			viewer.service.assertCanEditProduct('user_1', 'prod_1'),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
