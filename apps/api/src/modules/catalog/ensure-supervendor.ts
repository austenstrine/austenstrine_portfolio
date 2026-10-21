import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, VendorMemberRole } from '@prisma/client';

type SupervendorSeed = {
	vendor: {
		slug: string;
		name: string;
		isSuperVendor: boolean;
	};
	admin: {
		email: string;
	};
};

const SUPERVENDOR_FILE = 'Supervendor.json';

export const supervendorSeed = loadSupervendorSeed();
export const SUPERVENDOR_SLUG = supervendorSeed.vendor.slug;
export const SUPERVENDOR_NAME = supervendorSeed.vendor.name;
export const SUPERVENDOR_ADMIN_EMAIL = supervendorSeed.admin.email;

export function loadSupervendorSeed(seedDir = defaultSeedDir()): SupervendorSeed {
	const parsed = JSON.parse(
		readFileSync(join(seedDir, SUPERVENDOR_FILE), 'utf8'),
	) as SupervendorSeed;
	if(!parsed.vendor?.slug || !parsed.vendor.name || !parsed.admin?.email) {
		throw new Error(`${SUPERVENDOR_FILE} is missing vendor.slug, vendor.name, or admin.email.`);
	}
	return parsed;
}

export async function ensureSupervendor(
	prisma: PrismaClient,
	seedDir = defaultSeedDir(),
): Promise<void> {
	const seed = loadSupervendorSeed(seedDir);
	const vendor = await prisma.vendor.upsert({
		where: { slug: seed.vendor.slug },
		create: {
			slug: seed.vendor.slug,
			name: seed.vendor.name,
			isSuperVendor: seed.vendor.isSuperVendor,
		},
		update: {
			name: seed.vendor.name,
			isSuperVendor: seed.vendor.isSuperVendor,
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
		where: { email: seed.admin.email },
	});

	if(!user) {
		user = await prisma.user.create({
			data: {
				email: seed.admin.email,
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

function defaultSeedDir(): string {
	return join(__dirname, '../../../prisma/seed-data');
}
