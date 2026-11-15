import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateRoadmapSuggestionDto } from './dto/create-roadmap-suggestion.dto';

@Injectable()
export class RoadmapService {
	constructor(private readonly prisma: PrismaService) {}

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
			},
		});

		return { ok: true as const };
	}
}
