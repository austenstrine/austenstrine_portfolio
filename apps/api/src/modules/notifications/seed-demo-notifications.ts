import type { PrismaClient } from '@prisma/client';
import { SUPERVENDOR_ADMIN_EMAIL } from '../catalog/ensure-supervendor';

const DEMO_WELCOME_KIND = 'system.welcome';
const DEMO_TIP_KIND = 'vendor.listings_tip';

/**
 * Idempotent demo inbox row for the supervendor admin so the AccountMenu
 * badge is visible on a fresh seed. Drops the old seed tip (coaching noise)
 * and keeps welcome copy short.
 */
export async function seedDemoNotifications(prisma: PrismaClient): Promise<void> {
	const admin = await prisma.user.findUnique({
		where: { email: SUPERVENDOR_ADMIN_EMAIL },
		select: { id: true },
	});
	if(!admin) {
		return;
	}

	await prisma.notification.deleteMany({
		where: {
			userId: admin.id,
			kind: DEMO_TIP_KIND,
		},
	});

	const existingWelcome = await prisma.notification.findFirst({
		where: {
			userId: admin.id,
			kind: DEMO_WELCOME_KIND,
		},
		select: { id: true },
	});

	if(existingWelcome) {
		await prisma.notification.update({
			where: { id: existingWelcome.id },
			data: {
				title: 'Welcome to Place et Marque',
				body: null,
				href: '/place-et-marque/vendors',
				payload: { source: 'seed' },
			},
		});
		return;
	}

	await prisma.notification.create({
		data: {
			userId: admin.id,
			kind: DEMO_WELCOME_KIND,
			title: 'Welcome to Place et Marque',
			body: null,
			href: '/place-et-marque/vendors',
			payload: { source: 'seed' },
		},
	});
}
