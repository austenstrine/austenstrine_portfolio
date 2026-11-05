import {
	Controller,
	Get,
	Param,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
	constructor(private readonly notifications: NotificationsService) {}

	@UseGuards(JwtAuthGuard)
	@Get()
	list(
		@Req() req: AuthedRequest,
		@Query('limit') limitRaw?: string,
		@Query('unreadOnly') unreadOnlyRaw?: string,
	) {
		const parsed = limitRaw ? Number(limitRaw) : undefined;
		const limit = Number.isFinite(parsed) ? parsed : undefined;
		const unreadOnly =
			unreadOnlyRaw === '1'
			|| unreadOnlyRaw === 'true';
		return this.notifications.listForUser(req.user!.id, {
			limit,
			unreadOnly,
		});
	}

	@UseGuards(JwtAuthGuard)
	@Get('unread-count')
	unreadCount(@Req() req: AuthedRequest) {
		return this.notifications.unreadCount(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Post('read-all')
	markAllRead(@Req() req: AuthedRequest) {
		return this.notifications.markAllRead(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Post(':id/read')
	markRead(@Req() req: AuthedRequest, @Param('id') id: string) {
		return this.notifications.markRead(req.user!.id, id);
	}
}
