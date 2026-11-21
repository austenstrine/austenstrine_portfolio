import {
	Body,
	Controller,
	Get,
	Headers,
	Param,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CrmOriginGuard } from '../catalog/guards/crm-origin.guard';
import { CreateRoadmapSuggestionDto } from './dto/create-roadmap-suggestion.dto';
import { ReviewRoadmapSuggestionDto } from './dto/review-roadmap-suggestion.dto';
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

	@UseGuards(JwtAuthGuard, CrmOriginGuard)
	@Get('suggestions')
	listSuggestions(
		@Req() req: AuthedRequest,
		@Query('status') status?: string,
	) {
		return this.roadmap.listSuggestions(req.user!.id, status);
	}

	@UseGuards(JwtAuthGuard, CrmOriginGuard)
	@Post('suggestions/:suggestionId/review')
	reviewSuggestion(
		@Req() req: AuthedRequest,
		@Param('suggestionId') suggestionId: string,
		@Body() dto: ReviewRoadmapSuggestionDto,
	) {
		return this.roadmap.reviewSuggestion(req.user!.id, suggestionId, dto);
	}
}
