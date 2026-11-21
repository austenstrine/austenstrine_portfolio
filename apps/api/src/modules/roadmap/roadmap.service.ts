import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { RoadmapSuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { VendorAccessService } from '../catalog/vendor-access.service';
import { CreateRoadmapSuggestionDto } from './dto/create-roadmap-suggestion.dto';
import { ReviewRoadmapSuggestionDto } from './dto/review-roadmap-suggestion.dto';

@Injectable()
export class RoadmapService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
	) {}

	async create(
		dto: CreateRoadmapSuggestionDto,
		opts: {
			userId?: string;
			userAgent?: string;
		} = {},
	) {
		const honeypot = dto.website?.trim();
		if(honeypot) {
			// Pretend success so bots do not retry.
			return { ok: true as const };
		}

		const body = dto.body.trim();
		const name = dto.name?.trim() || null;
		const email = dto.email?.trim().toLowerCase() || null;
		const userAgent = opts.userAgent?.slice(0, 400) || null;

		await this.prisma.roadmapSuggestion.create({
			data: {
				body,
				name,
				email,
				userId: opts.userId ?? null,
				userAgent,
				status: RoadmapSuggestionStatus.PENDING,
			},
		});

		return { ok: true as const };
	}

	async listSuggestions(userId: string, status?: string) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);
		const allowed = new Set(['PENDING', 'APPROVED', 'REJECTED']);
		const filterStatus =
			status && allowed.has(status.toUpperCase())
				? (status.toUpperCase() as RoadmapSuggestionStatus)
				: RoadmapSuggestionStatus.PENDING;

		const rows = await this.prisma.roadmapSuggestion.findMany({
			where: { status: filterStatus },
			include: {
				user: { select: { id: true, email: true } },
			},
			orderBy: { createdAt: 'asc' },
			take: 100,
		});

		return rows.map((row) => ({
			id: row.id,
			body: row.body,
			name: row.name,
			email: row.email,
			userId: row.userId,
			userEmail: row.user?.email ?? null,
			userAgent: row.userAgent,
			status: row.status,
			reviewReason: row.reviewReason,
			createdAt: row.createdAt,
			reviewedAt: row.reviewedAt,
		}));
	}

	async reviewSuggestion(
		userId: string,
		suggestionId: string,
		dto: ReviewRoadmapSuggestionDto,
	) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);

		const suggestion = await this.prisma.roadmapSuggestion.findUnique({
			where: { id: suggestionId },
		});
		if(!suggestion) {
			throw new NotFoundException('Suggestion not found.');
		}
		if(suggestion.status !== RoadmapSuggestionStatus.PENDING) {
			throw new BadRequestException('That suggestion was already reviewed.');
		}

		const nextStatus =
			dto.decision === 'approve'
				? RoadmapSuggestionStatus.APPROVED
				: RoadmapSuggestionStatus.REJECTED;
		const reason = dto.reason?.trim() || null;

		const claim = await this.prisma.roadmapSuggestion.updateMany({
			where: {
				id: suggestion.id,
				status: RoadmapSuggestionStatus.PENDING,
			},
			data: {
				status: nextStatus,
				reviewReason: reason,
				reviewedByUserId: userId,
				reviewedAt: new Date(),
			},
		});
		if(claim.count !== 1) {
			throw new BadRequestException('That suggestion was already reviewed.');
		}

		const updated = await this.prisma.roadmapSuggestion.findUniqueOrThrow({
			where: { id: suggestion.id },
		});

		return {
			id: updated.id,
			status: updated.status,
			reviewReason: updated.reviewReason,
			reviewedAt: updated.reviewedAt,
		};
	}
}
