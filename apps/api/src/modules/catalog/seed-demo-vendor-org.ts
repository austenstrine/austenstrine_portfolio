import {
	PlaceEtMarqueOrderStatus,
	PayoutTrigger,
	PrismaClient,
	VendorMemberRole,
	VendorPayoutStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
	SUPERVENDOR_ADMIN_EMAIL,
	ensureSupervendor,
} from './ensure-supervendor';

const DEMO_BUYER_EMAIL = 'buyer@austenstrine.dev';
const DEMO_EDITOR_EMAIL = 'editor@austenstrine.dev';
const DEMO_VIEWER_EMAIL = 'viewer@austenstrine.dev';

type DemoVendorRow = {
	id: string;
	slug: string;
	name: string;
	isSuperVendor: boolean;
};

function demoVendorFromSeed(seedDir: string): DemoVendorRow {
	const file = JSON.parse(
		readFileSync(join(seedDir, 'Vendor.json'), 'utf8'),
	) as {
		records?: Array<DemoVendorRow>;
	};
	const row = file.records?.[0];
	if(!row?.id || !row.slug || !row.name) {
		throw new Error('Vendor.json is missing the demo vendor record.');
	}
	return row;
}

async function ensureVerifiedUser(
	prisma: PrismaClient,
	email: string,
): Promise<{ id: string; email: string }> {
	const normalized = email.trim().toLowerCase();
	const existing = await prisma.user.findUnique({
		where: { email: normalized },
	});
	if(existing) {
		if(!existing.emailVerifiedAt) {
			return prisma.user.update({
				where: { id: existing.id },
				data: { emailVerifiedAt: new Date() },
				select: { id: true, email: true },
			});
		}
		return { id: existing.id, email: existing.email };
	}
	return prisma.user.create({
		data: {
			email: normalized,
			emailVerifiedAt: new Date(),
		},
		select: { id: true, email: true },
	});
}

async function ensureMembership(
	prisma: PrismaClient,
	vendorId: string,
	userId: string,
	role: VendorMemberRole,
): Promise<void> {
	await prisma.vendorMember.upsert({
		where: {
			vendorId_userId: { vendorId, userId },
		},
		create: { vendorId, userId, role },
		update: { role },
	});
}

/**
 * Ensures Demo Supply Co. is a full seller playground: OWNER, teammate
 * members, shipping profile, sample paid/shipped orders, and payout rows.
 * Idempotent — safe on every seed / bootstrap.
 */
export async function seedDemoVendorOrg(
	prisma: PrismaClient,
	seedDir = join(__dirname, '../../../prisma/seed-data'),
): Promise<void> {
	await ensureSupervendor(prisma, seedDir);

	const demo = demoVendorFromSeed(seedDir);
	const vendor = await prisma.vendor.upsert({
		where: { slug: demo.slug },
		create: {
			id: demo.id,
			slug: demo.slug,
			name: demo.name,
			isSuperVendor: demo.isSuperVendor,
		},
		update: {
			name: demo.name,
			isSuperVendor: demo.isSuperVendor,
		},
	});

	const owner = await ensureVerifiedUser(prisma, SUPERVENDOR_ADMIN_EMAIL);
	await ensureMembership(
		prisma,
		vendor.id,
		owner.id,
		VendorMemberRole.OWNER,
	);

	const editor = await ensureVerifiedUser(prisma, DEMO_EDITOR_EMAIL);
	await ensureMembership(
		prisma,
		vendor.id,
		editor.id,
		VendorMemberRole.EDITOR,
	);

	const viewer = await ensureVerifiedUser(prisma, DEMO_VIEWER_EMAIL);
	await ensureMembership(
		prisma,
		vendor.id,
		viewer.id,
		VendorMemberRole.VIEWER,
	);

	const buyer = await ensureVerifiedUser(prisma, DEMO_BUYER_EMAIL);

	const shippingProfile = await prisma.shippingProfile.upsert({
		where: {
			vendorId_code: {
				vendorId: vendor.id,
				code: 'STANDARD',
			},
		},
		create: {
			vendorId: vendor.id,
			code: 'STANDARD',
			name: 'Standard ground',
			shipsSeparately: false,
			payoutTrigger: PayoutTrigger.ON_PAYMENT,
		},
		update: {
			name: 'Standard ground',
			payoutTrigger: PayoutTrigger.ON_PAYMENT,
		},
	});

	const existingRate = await prisma.shippingRate.findFirst({
		where: { profileId: shippingProfile.id },
	});
	if(!existingRate) {
		await prisma.shippingRate.create({
			data: {
				profileId: shippingProfile.id,
				label: 'Ground · 3–5 days',
				amountCents: 599,
			},
		});
	}

	const offerings = await prisma.productOffering.findMany({
		where: {
			vendorId: vendor.id,
			priceCents: { gt: 0 },
		},
		include: {
			product: { select: { title: true } },
			uom: { select: { code: true } },
		},
		orderBy: { createdAt: 'asc' },
		take: 8,
	});

	if(offerings.length === 0) {
		return;
	}

	const sampleOrders: Array<{
		orderRef: string;
		status: PlaceEtMarqueOrderStatus;
		offeringIndex: number;
		qty: number;
		shipName: string;
		city: string;
		region: string;
		payoutStatus: VendorPayoutStatus;
		daysAgo: number;
	}> = [
		{
			orderRef: 'seed_demo_ord_01',
			status: PlaceEtMarqueOrderStatus.SHIPPED,
			offeringIndex: 0,
			qty: 1,
			shipName: 'Casey Buyer',
			city: 'Murray',
			region: 'UT',
			payoutStatus: VendorPayoutStatus.TRANSFERRED,
			daysAgo: 12,
		},
		{
			orderRef: 'seed_demo_ord_02',
			status: PlaceEtMarqueOrderStatus.PAID,
			offeringIndex: 1,
			qty: 2,
			shipName: 'Casey Buyer',
			city: 'Salt Lake City',
			region: 'UT',
			payoutStatus: VendorPayoutStatus.READY,
			daysAgo: 3,
		},
		{
			orderRef: 'seed_demo_ord_03',
			status: PlaceEtMarqueOrderStatus.PAID,
			offeringIndex: 2,
			qty: 1,
			shipName: 'Riley Shopper',
			city: 'Provo',
			region: 'UT',
			payoutStatus: VendorPayoutStatus.PENDING,
			daysAgo: 1,
		},
		{
			orderRef: 'seed_demo_ord_04',
			status: PlaceEtMarqueOrderStatus.FULFILLING,
			offeringIndex: 3,
			qty: 1,
			shipName: 'Jordan Cart',
			city: 'Ogden',
			region: 'UT',
			payoutStatus: VendorPayoutStatus.READY,
			daysAgo: 2,
		},
		{
			orderRef: 'seed_demo_ord_05',
			status: PlaceEtMarqueOrderStatus.SHIPPED,
			offeringIndex: 4,
			qty: 3,
			shipName: 'Alex Parcel',
			city: 'Parowan',
			region: 'UT',
			payoutStatus: VendorPayoutStatus.TRANSFERRED,
			daysAgo: 20,
		},
	];

	for(const sample of sampleOrders) {
		const offering = offerings[sample.offeringIndex % offerings.length]!;
		const unitPrice = offering.priceCents;
		const merchandiseCents = unitPrice * sample.qty;
		const shippingCents = 599;
		const feeCents = Math.round(merchandiseCents * 0.1);
		const vendorNetCents = merchandiseCents + shippingCents - feeCents;
		const createdAt = new Date(
			Date.now() - sample.daysAgo * 24 * 60 * 60 * 1000,
		);

		const existing = await prisma.placeEtMarqueOrder.findUnique({
			where: { orderRef: sample.orderRef },
			select: { id: true },
		});
		if(existing) {
			continue;
		}

		const order = await prisma.placeEtMarqueOrder.create({
			data: {
				orderRef: sample.orderRef,
				buyerId: buyer.id,
				vendorId: vendor.id,
				shippingProfileId: shippingProfile.id,
				status: sample.status,
				currency: 'USD',
				merchandiseCents,
				shippingCents,
				totalCents: merchandiseCents + shippingCents,
				feeCents,
				vendorNetCents,
				payoutTrigger: PayoutTrigger.ON_PAYMENT,
				shippingLabel: 'Ground · 3–5 days',
				shipName: sample.shipName,
				shipLine1: '100 Demo Street',
				shipCity: sample.city,
				shipRegion: sample.region,
				shipPostal: '84101',
				shipCountry: 'US',
				shippedAt:
					sample.status === PlaceEtMarqueOrderStatus.SHIPPED
						? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
						: null,
				createdAt,
				updatedAt: createdAt,
				lines: {
					create: [
						{
							offeringId: offering.id,
							quantity: new Decimal(sample.qty),
							unitPriceCents: unitPrice,
							lineTotalCents: merchandiseCents,
							titleSnapshot: offering.product.title,
							skuSnapshot: offering.sku,
							offeringKeySnapshot: offering.offeringKey,
						},
					],
				},
				payout: {
					create: {
						vendorId: vendor.id,
						merchandiseCents,
						shippingCents,
						feeCents,
						vendorNetCents,
						currency: 'USD',
						status: sample.payoutStatus,
						trigger: PayoutTrigger.ON_PAYMENT,
						readyAt:
							sample.payoutStatus === VendorPayoutStatus.PENDING
								? null
								: createdAt,
						transferredAt:
							sample.payoutStatus === VendorPayoutStatus.TRANSFERRED
								? new Date(
									createdAt.getTime() + 3 * 24 * 60 * 60 * 1000,
								)
								: null,
						stripeTransferId:
							sample.payoutStatus === VendorPayoutStatus.TRANSFERRED
								? `seed_tr_${sample.orderRef}`
								: null,
					},
				},
			},
		});

		void order;
	}
}

export const DEMO_VENDOR_SLUG = 'demo-supply';
export {
	DEMO_BUYER_EMAIL,
	DEMO_EDITOR_EMAIL,
	DEMO_VIEWER_EMAIL,
};
