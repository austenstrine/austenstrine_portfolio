import {
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SecurityService } from '../auth/security/security.service';
import type { AppPasswordCatalogActor } from './catalog-actor';

const TOKEN_PREFIX = 'vas';

@Injectable()
export class VendorAppPasswordService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly security: SecurityService,
	) {}

	async assertOwner(userId: string, vendorId: string) {
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: {
					vendorId,
					userId,
				},
			},
		});

		if(!membership || membership.role !== VendorMemberRole.OWNER) {
			throw new ForbiddenException('Only vendor owners can manage app passwords.');
		}
	}

	async list(userId: string, vendorId: string) {
		await this.assertOwner(userId, vendorId);

		const rows = await this.prisma.vendorAppPassword.findMany({
			where: { vendorId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				name: true,
				tokenPrefix: true,
				lastUsedAt: true,
				revokedAt: true,
				createdAt: true,
			},
		});

		return rows.map((row) => ({
			...row,
			hint: `${TOKEN_PREFIX}_${row.tokenPrefix}_…`,
			active: !row.revokedAt,
		}));
	}

	async create(userId: string, vendorId: string, name: string) {
		await this.assertOwner(userId, vendorId);

		const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		const tokenPrefix = randomBytes(3).toString('hex');
		const secret = randomBytes(24).toString('hex');
		const plaintext = `${TOKEN_PREFIX}_${tokenPrefix}_${secret}`;
		const secretHash = this.security.hashOpaqueToken(plaintext);

		const row = await this.prisma.vendorAppPassword.create({
			data: {
				vendorId,
				name: name.trim() || 'Server access',
				tokenPrefix,
				secretHash,
				createdByUserId: userId,
			},
			select: {
				id: true,
				name: true,
				tokenPrefix: true,
				createdAt: true,
			},
		});

		return {
			...row,
			hint: `${TOKEN_PREFIX}_${tokenPrefix}_…`,
			token: plaintext,
			warning: 'Copy this token now. It will not be shown again.',
		};
	}

	async revoke(userId: string, vendorId: string, passwordId: string) {
		await this.assertOwner(userId, vendorId);

		const row = await this.prisma.vendorAppPassword.findFirst({
			where: { id: passwordId, vendorId },
		});

		if(!row) {
			throw new NotFoundException('App password not found.');
		}

		if(row.revokedAt) {
			return { id: row.id, revokedAt: row.revokedAt };
		}

		const updated = await this.prisma.vendorAppPassword.update({
			where: { id: row.id },
			data: { revokedAt: new Date() },
			select: { id: true, revokedAt: true },
		});

		return updated;
	}

	async authenticateBearer(rawToken: string): Promise<AppPasswordCatalogActor | null> {
		const token = rawToken.trim();
		if(!token.startsWith(`${TOKEN_PREFIX}_`)) {
			return null;
		}

		const secretHash = this.security.hashOpaqueToken(token);
		const row = await this.prisma.vendorAppPassword.findUnique({
			where: { secretHash },
		});

		if(!row || row.revokedAt) {
			throw new UnauthorizedException('Invalid or revoked app password.');
		}

		await this.prisma.vendorAppPassword.update({
			where: { id: row.id },
			data: { lastUsedAt: new Date() },
		});

		return {
			kind: 'app_password',
			vendorId: row.vendorId,
			passwordId: row.id,
			createdByUserId: row.createdByUserId,
		};
	}
}
