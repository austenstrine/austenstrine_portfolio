import type { PrismaClient } from '@prisma/client';
import { SUPERVENDOR_ADMIN_EMAIL } from '../catalog/ensure-supervendor';

const DEMO_KINDS = [
	'system.welcome',
	'vendor.listings_tip',
] as const;

/**
 * Idempotent demo inbox rows for the supervendor admin so the AccountMenu
 * bubble is visible on a fresh seed.
 */
export async function seedDemoNotifications(prisma: PrismaClient): Promise<void> {
	const admin = await prisma.user.findUnique({
		where: { email: SUPERVENDOR_ADMIN_EMAIL },
		select: { id: true },
	});
	if(!admin) {
		return;
	}

	const existing = await prisma.notification.count({
		where: {
			userId: admin.id,
			kind: { in: [...DEMO_KINDS] },
		},
	});
	if(existing > 0) {
		return;
	}

	await prisma.notification.createMany({
		data: [
			{
				userId: admin.id,
				kind: 'system.welcome',
				title: 'Welcome to selling on Place et Marque',
				body: 'Use Vendors and Manage listings from your account menu to set up your catalog.',
				href: '/place-et-marque/vendors',
				payload: { source: 'seed' },
			},
			{
				userId: admin.id,
				kind: 'vendor.listings_tip',
				title: 'Tip: keep inventory current',
				body: 'Open Manage listings to filter by vendor and update stock before shoppers hit checkout.',
				href: '/place-et-marque/manage',
				payload: { source: 'seed' },
			},
		],
	});
}
