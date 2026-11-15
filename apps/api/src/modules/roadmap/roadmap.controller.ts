import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateRoadmapSuggestionDto } from './dto/create-roadmap-suggestion.dto';
import { RoadmapService } from './roadmap.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('roadmap')
@Controller('roadmap')
export class RoadmapController {
	constructor(private readonly roadmap: RoadmapService) {}

	@Post('suggestions')
	@UseGuards(OptionalJwtAuthGuard)
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	createSuggestion(
		@Req() req: AuthedRequest,
		@Body() dto: CreateRoadmapSuggestionDto,
		@Headers('user-agent') userAgent?: string,
	) {
		return this.roadmap.create(dto, {
			userId: req.user?.id,
			userAgent,
		});
	}
}
