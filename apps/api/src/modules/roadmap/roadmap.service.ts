import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { RoadmapSuggestionStatus } from '@prisma/client';
import { MailService } from '../../infra/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { VendorAccessService } from '../catalog/vendor-access.service';
import { CreateRoadmapSuggestionDto } from './dto/create-roadmap-suggestion.dto';
import { ReviewRoadmapSuggestionDto } from './dto/review-roadmap-suggestion.dto';

/** Fallback for legacy rows and empty submissions before email was required. */
export const ROADMAP_SPOOF_EMAIL = 'spoof@austenstrine.dev';

@Injectable()
export class RoadmapService {
	private readonly logger = new Logger(RoadmapService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
		private readonly mail: MailService,
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
		const email = dto.email.trim().toLowerCase() || ROADMAP_SPOOF_EMAIL;
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

	async listApproved() {
		const rows = await this.prisma.roadmapSuggestion.findMany({
			where: { status: RoadmapSuggestionStatus.APPROVED },
			select: {
				id: true,
				body: true,
				name: true,
				reviewedAt: true,
				createdAt: true,
			},
			orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
			take: 100,
		});

		return rows.map((row) => ({
			id: row.id,
			body: row.body,
			name: row.name,
			reviewedAt: row.reviewedAt,
			createdAt: row.createdAt,
		}));
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

		await this.notifyReviewStatus(updated.email, updated.body, nextStatus, reason);

		return {
			id: updated.id,
			status: updated.status,
			reviewReason: updated.reviewReason,
			reviewedAt: updated.reviewedAt,
		};
	}

	private resolveNotifyEmail(raw: string | null | undefined): string {
		const trimmed = raw?.trim().toLowerCase() || '';
		return trimmed || ROADMAP_SPOOF_EMAIL;
	}

	private async notifyReviewStatus(
		rawEmail: string | null | undefined,
		body: string,
		status: RoadmapSuggestionStatus,
		reason: string | null,
	): Promise<void> {
		const to = this.resolveNotifyEmail(rawEmail);
		const excerpt = body.trim().slice(0, 280);
		const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
		const roadmapUrl = `${webUrl}/place-et-marque/roadmap`;

		const approved = status === RoadmapSuggestionStatus.APPROVED;
		const subject = approved
			? 'Your Place et Marque roadmap idea was approved'
			: 'Update on your Place et Marque roadmap idea';
		const textLines = approved
			? [
					'Your roadmap suggestion was approved and is on the public roadmap.',
					'',
					`Suggestion: ${excerpt}`,
					'',
					`Roadmap: ${roadmapUrl}`,
				]
			: [
					'Your roadmap suggestion was not taken forward this time.',
					'',
					`Suggestion: ${excerpt}`,
					...(reason ? ['', `Note: ${reason}`] : []),
					'',
					`Roadmap: ${roadmapUrl}`,
				];
		const html = approved
			? `
				<p>Your roadmap suggestion was approved and is on the public roadmap.</p>
				<p><em>${escapeHtml(excerpt)}</em></p>
				<p><a href="${roadmapUrl}">View the roadmap</a></p>
			`
			: `
				<p>Your roadmap suggestion was not taken forward this time.</p>
				<p><em>${escapeHtml(excerpt)}</em></p>
				${reason ? `<p>Note: ${escapeHtml(reason)}</p>` : ''}
				<p><a href="${roadmapUrl}">View the roadmap</a></p>
			`;

		try {
			await this.mail.sendMailWithAttachment({
				to,
				subject,
				text: textLines.join('\n'),
				html,
			});
		}
		catch(error) {
			this.logger.error(
				`Roadmap review email failed for ${to} (${status})`,
				error as Error,
			);
		}
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
