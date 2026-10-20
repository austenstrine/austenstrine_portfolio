import { PrismaClient, VendorMemberRole } from '@prisma/client';

export const SUPERVENDOR_SLUG = 'austenstrine-dev';
export const SUPERVENDOR_NAME = 'austenstrine.dev';
export const SUPERVENDOR_ADMIN_EMAIL = 'admin@austenstrine.dev';

export async function ensureSupervendor(prisma: PrismaClient): Promise<void> {
	const vendor = await prisma.vendor.upsert({
		where: { slug: SUPERVENDOR_SLUG },
		create: {
			slug: SUPERVENDOR_SLUG,
			name: SUPERVENDOR_NAME,
			isSuperVendor: true,
		},
		update: {
			name: SUPERVENDOR_NAME,
			isSuperVendor: true,
		},
	});

	await prisma.vendor.updateMany({
		where: {
			id: { not: vendor.id },
			isSuperVendor: true,
		},
		data: { isSuperVendor: false },
	});

	let user = await prisma.user.findUnique({
		where: { email: SUPERVENDOR_ADMIN_EMAIL },
	});

	if(!user) {
		user = await prisma.user.create({
			data: {
				email: SUPERVENDOR_ADMIN_EMAIL,
				emailVerifiedAt: new Date(),
			},
		});
	}
	else if(!user.emailVerifiedAt) {
		user = await prisma.user.update({
			where: { id: user.id },
			data: { emailVerifiedAt: new Date() },
		});
	}

	await prisma.vendorMember.upsert({
		where: {
			vendorId_userId: {
				vendorId: vendor.id,
				userId: user.id,
			},
		},
		create: {
			vendorId: vendor.id,
			userId: user.id,
			role: VendorMemberRole.OWNER,
		},
		update: {
			role: VendorMemberRole.OWNER,
		},
	});
}
