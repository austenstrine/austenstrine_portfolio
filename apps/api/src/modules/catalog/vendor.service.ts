import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { VendorLinkNameRequestStatus, VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';
import { RequestVendorLinkNameDto } from './dto/request-vendor-link-name.dto';
import { ReviewVendorLinkNameDto } from './dto/review-vendor-link-name.dto';
import { VendorAccessService } from './vendor-access.service';
import {
	assertValidLinkNameFormat,
	findLinkNameConflict,
	isUuidLike,
	throwLinkNameConflict,
} from './vendor-link-name';

@Injectable()
export class VendorService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
	) {}

	async createVendor(userId: string, dto: CreateVendorDto) {
		const slug = assertValidLinkNameFormat(dto.slug);
		const name = dto.name.trim();
		await this.assertLinkNameAvailable(slug);

		const vendor = await this.prisma.vendor.create({
			data: {
				name,
				slug,
				members: {
					create: {
						userId,
						role: VendorMemberRole.OWNER,
					},
				},
			},
			include: {
				members: {
					where: { userId },
					select: { role: true },
				},
				_count: { select: { products: true, members: true } },
			},
		});

		return this.toVendorSummary(vendor);
	}

	async checkLinkNameAvailable(candidate: string, excludeVendorId?: string) {
		const slug = assertValidLinkNameFormat(candidate);
		const conflict = await this.findConflictForSlug(slug, excludeVendorId);
		if(conflict) {
			return {
				available: false as const,
				kind: conflict,
				message:
					conflict === 'taken'
						? 'That name in the link is already taken. Pick a different one.'
						: 'That name is too similar to another seller’s name in the link. Try something more distinct.',
			};
		}
		return { available: true as const, kind: null, message: null };
	}

	async listMyVendors(userId: string) {
		const memberships = await this.prisma.vendorMember.findMany({
			where: { userId },
			include: {
				vendor: {
					include: {
						_count: { select: { products: true, members: true } },
					},
				},
			},
			orderBy: { createdAt: 'asc' },
		});

		return memberships.map((membership) => ({
			...this.toVendorSummary({
				...membership.vendor,
				members: [{ role: membership.role }],
			}),
			joinedAt: membership.createdAt,
		}));
	}

	/** Public buyer storefront lookup by link name (or legacy UUID). */
	async getPublicVendor(vendorRef: string) {
		const vendor = await this.resolveVendorRecord(vendorRef);
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}
		const productCount = await this.prisma.catalogProduct.count({
			where: { vendorId: vendor.id },
		});
		return {
			id: vendor.id,
			name: vendor.name,
			slug: vendor.slug,
			productCount,
			...this.toPublicProfile(vendor),
		};
	}

	/** Seller edits for buyer-facing storefront fields. */
	async updateVendorProfile(
		userId: string,
		vendorRef: string,
		dto: UpdateVendorProfileDto,
	) {
		const vendor = await this.requireVendorMember(
			userId,
			vendorRef,
			[VendorMemberRole.OWNER, VendorMemberRole.EDITOR],
		);

		const data: {
			tagline?: string | null;
			about?: string | null;
			locationLabel?: string | null;
			contactEmail?: string | null;
			contactPhone?: string | null;
			websiteUrl?: string | null;
		} = {};

		if('tagline' in dto) {
			data.tagline = this.nullableTrim(dto.tagline, 160);
		}
		if('about' in dto) {
			data.about = this.nullableTrim(dto.about, 5000);
		}
		if('locationLabel' in dto) {
			data.locationLabel = this.nullableTrim(dto.locationLabel, 120);
		}
		if('contactEmail' in dto) {
			const email = this.nullableTrim(dto.contactEmail, 254);
			data.contactEmail = email
				? email.toLowerCase()
				: null;
		}
		if('contactPhone' in dto) {
			data.contactPhone = this.nullableTrim(dto.contactPhone, 40);
		}
		if('websiteUrl' in dto) {
			data.websiteUrl = this.nullableTrim(dto.websiteUrl, 500);
		}

		const updated = await this.prisma.vendor.update({
			where: { id: vendor.id },
			data,
			include: {
				members: {
					where: { userId },
					select: { role: true },
				},
				_count: { select: { products: true, members: true } },
			},
		});

		return {
			...this.toVendorSummary(updated),
			...this.toPublicProfile(updated),
		};
	}

	/**
	 * Resolve membership vendor by human-readable link name or legacy UUID.
	 */
	async getMyVendor(userId: string, vendorRef: string) {
		const vendor = await this.resolveVendorRecord(vendorRef);
		if(!vendor) {
			throw new NotFoundException('Vendor not found, or you are not a member.');
		}

		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: { vendorId: vendor.id, userId },
			},
			include: {
				vendor: {
					include: {
						members: {
							include: {
								user: { select: { id: true, email: true } },
							},
							orderBy: { createdAt: 'asc' },
						},
						_count: { select: { products: true, members: true } },
						linkNameRequests: {
							where: {
								status: {
									in: [
										VendorLinkNameRequestStatus.PENDING,
										VendorLinkNameRequestStatus.DENIED,
									],
								},
							},
							orderBy: { createdAt: 'desc' },
							take: 1,
						},
					},
				},
			},
		});

		if(!membership) {
			throw new NotFoundException('Vendor not found, or you are not a member.');
		}

		const latestRequest = membership.vendor.linkNameRequests[0] ?? null;

		return {
			id: membership.vendor.id,
			name: membership.vendor.name,
			slug: membership.vendor.slug,
			isSuperVendor: membership.vendor.isSuperVendor,
			createdAt: membership.vendor.createdAt,
			productCount: membership.vendor._count.products,
			memberCount: membership.vendor._count.members,
			myRole: membership.role,
			...this.toPublicProfile(membership.vendor),
			members: membership.vendor.members.map((member) => ({
				userId: member.user.id,
				email: member.user.email,
				role: member.role,
				joinedAt: member.createdAt,
			})),
			linkNameRequest: latestRequest
				? {
					id: latestRequest.id,
					requestedSlug: latestRequest.requestedSlug,
					currentSlug: latestRequest.currentSlug,
					status: latestRequest.status,
					requesterNote: latestRequest.requesterNote,
					reviewReason: latestRequest.reviewReason,
					createdAt: latestRequest.createdAt,
					reviewedAt: latestRequest.reviewedAt,
				}
				: null,
			resolvedFromId: isUuidLike(vendorRef) && vendorRef !== membership.vendor.slug,
		};
	}

	async requestLinkNameChange(
		userId: string,
		vendorRef: string,
		dto: RequestVendorLinkNameDto,
	) {
		const vendor = await this.requireVendorMember(
			userId,
			vendorRef,
			[VendorMemberRole.OWNER],
		);
		const requestedSlug = assertValidLinkNameFormat(dto.linkName);
		if(requestedSlug === vendor.slug) {
			throw new BadRequestException(
				'That is already this organization’s name in the link.',
			);
		}
		await this.assertLinkNameAvailable(requestedSlug, vendor.id);

		await this.prisma.vendorLinkNameRequest.updateMany({
			where: {
				vendorId: vendor.id,
				status: VendorLinkNameRequestStatus.PENDING,
			},
			data: {
				status: VendorLinkNameRequestStatus.CANCELLED,
				reviewedAt: new Date(),
				reviewReason: 'Replaced by a newer request.',
			},
		});

		const created = await this.prisma.vendorLinkNameRequest.create({
			data: {
				vendorId: vendor.id,
				requestedSlug,
				currentSlug: vendor.slug,
				requestedByUserId: userId,
				requesterNote: dto.note?.trim() || null,
			},
		});

		return {
			id: created.id,
			requestedSlug: created.requestedSlug,
			currentSlug: created.currentSlug,
			status: created.status,
			requesterNote: created.requesterNote,
			createdAt: created.createdAt,
			message: 'Request sent. Place et Marque will review the new name in the link.',
		};
	}

	async listLinkNameRequests(userId: string, status?: string) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);
		const allowed = new Set(['PENDING', 'APPROVED', 'DENIED', 'CANCELLED']);
		const filterStatus =
			status && allowed.has(status.toUpperCase())
				? (status.toUpperCase() as VendorLinkNameRequestStatus)
				: VendorLinkNameRequestStatus.PENDING;

		const rows = await this.prisma.vendorLinkNameRequest.findMany({
			where: { status: filterStatus },
			include: {
				vendor: { select: { id: true, name: true, slug: true } },
			},
			orderBy: { createdAt: 'asc' },
			take: 100,
		});

		return rows.map((row) => ({
			id: row.id,
			vendorId: row.vendorId,
			vendorName: row.vendor.name,
			vendorSlug: row.vendor.slug,
			requestedSlug: row.requestedSlug,
			currentSlug: row.currentSlug,
			status: row.status,
			requesterNote: row.requesterNote,
			reviewReason: row.reviewReason,
			createdAt: row.createdAt,
			reviewedAt: row.reviewedAt,
		}));
	}

	async reviewLinkNameRequest(
		userId: string,
		requestId: string,
		dto: ReviewVendorLinkNameDto,
	) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);

		const request = await this.prisma.vendorLinkNameRequest.findUnique({
			where: { id: requestId },
			include: { vendor: true },
		});
		if(!request) {
			throw new NotFoundException('Link name request not found.');
		}
		if(request.status !== VendorLinkNameRequestStatus.PENDING) {
			throw new BadRequestException('That request was already reviewed.');
		}

		if(dto.decision === 'deny') {
			const reason = dto.reason?.trim();
			if(!reason) {
				throw new BadRequestException(
					'Give a plain-language reason when denying a link name request.',
				);
			}
			const denied = await this.prisma.vendorLinkNameRequest.update({
				where: { id: request.id },
				data: {
					status: VendorLinkNameRequestStatus.DENIED,
					reviewReason: reason,
					reviewedByUserId: userId,
					reviewedAt: new Date(),
				},
			});
			return {
				id: denied.id,
				status: denied.status,
				reviewReason: denied.reviewReason,
				vendorSlug: request.vendor.slug,
			};
		}

		await this.assertLinkNameAvailable(request.requestedSlug, request.vendorId);

		const updated = await this.prisma.$transaction(async (tx) => {
			const vendor = await tx.vendor.update({
				where: { id: request.vendorId },
				data: { slug: request.requestedSlug },
			});
			const approved = await tx.vendorLinkNameRequest.update({
				where: { id: request.id },
				data: {
					status: VendorLinkNameRequestStatus.APPROVED,
					reviewReason: dto.note?.trim() || dto.reason?.trim() || null,
					reviewedByUserId: userId,
					reviewedAt: new Date(),
				},
			});
			return { vendor, approved };
		});

		return {
			id: updated.approved.id,
			status: updated.approved.status,
			reviewReason: updated.approved.reviewReason,
			vendorSlug: updated.vendor.slug,
		};
	}

	private async resolveVendorRecord(vendorRef: string) {
		const ref = vendorRef.trim();
		if(!ref) {
			return null;
		}
		const bySlug = await this.prisma.vendor.findUnique({ where: { slug: ref } });
		if(bySlug) {
			return bySlug;
		}
		if(isUuidLike(ref)) {
			return this.prisma.vendor.findUnique({ where: { id: ref } });
		}
		return null;
	}

	private async requireVendorMember(
		userId: string,
		vendorRef: string,
		roles: VendorMemberRole[],
	) {
		const vendor = await this.resolveVendorRecord(vendorRef);
		if(!vendor) {
			throw new NotFoundException('Vendor not found, or you are not a member.');
		}
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: { vendorId: vendor.id, userId },
			},
		});
		if(!membership) {
			throw new NotFoundException('Vendor not found, or you are not a member.');
		}
		if(!roles.includes(membership.role)) {
			const needsOwnerOnly =
				roles.length === 1 && roles[0] === VendorMemberRole.OWNER;
			throw new ForbiddenException(
				needsOwnerOnly
					? 'Only an organization owner can change the name in the link.'
					: 'You need edit access to update this organization.',
			);
		}
		return vendor;
	}

	private async assertLinkNameAvailable(slug: string, excludeVendorId?: string) {
		const conflict = await this.findConflictForSlug(slug, excludeVendorId);
		if(conflict) {
			throwLinkNameConflict(conflict);
		}
	}

	private async findConflictForSlug(slug: string, excludeVendorId?: string) {
		const vendors = await this.prisma.vendor.findMany({
			where: excludeVendorId
				? { id: { not: excludeVendorId } }
				: undefined,
			select: { slug: true },
		});
		return findLinkNameConflict(
			slug,
			vendors.map((row) => row.slug),
		);
	}

	private nullableTrim(value: string | null | undefined, max: number): string | null {
		if(value === undefined || value === null) {
			return null;
		}
		const trimmed = value.trim();
		if(!trimmed) {
			return null;
		}
		return trimmed.slice(0, max);
	}

	private toPublicProfile(vendor: {
		tagline?: string | null;
		about?: string | null;
		locationLabel?: string | null;
		contactEmail?: string | null;
		contactPhone?: string | null;
		websiteUrl?: string | null;
	}) {
		return {
			tagline: vendor.tagline ?? null,
			about: vendor.about ?? null,
			locationLabel: vendor.locationLabel ?? null,
			contactEmail: vendor.contactEmail ?? null,
			contactPhone: vendor.contactPhone ?? null,
			websiteUrl: vendor.websiteUrl ?? null,
		};
	}

	private toVendorSummary(vendor: {
		id: string;
		name: string;
		slug: string;
		createdAt: Date;
		isSuperVendor?: boolean;
		members: Array<{ role: VendorMemberRole }>;
		_count: { products: number; members: number };
	}) {
		return {
			id: vendor.id,
			name: vendor.name,
			slug: vendor.slug,
			isSuperVendor: Boolean(vendor.isSuperVendor),
			createdAt: vendor.createdAt,
			productCount: vendor._count.products,
			memberCount: vendor._count.members,
			myRole: vendor.members[0]?.role ?? VendorMemberRole.VIEWER,
		};
	}
}
