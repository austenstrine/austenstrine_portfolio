import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export type NotificationDto = {
	id: string;
	kind: string;
	title: string;
	body: string | null;
	href: string | null;
	payload: Prisma.JsonValue | null;
	readAt: string | null;
	createdAt: string;
};

type ListOptions = {
	limit?: number;
	/** Account menu: unread rows only. Inbox omits this. */
	unreadOnly?: boolean;
};

@Injectable()
export class NotificationsService {
	constructor(private readonly prisma: PrismaService) {}

	async listForUser(userId: string, options?: ListOptions) {
		const take = Math.min(Math.max(options?.limit ?? 30, 1), 100);
		const unreadOnly = Boolean(options?.unreadOnly);

		if(unreadOnly) {
			const rows = await this.prisma.notification.findMany({
				where: {
					userId,
					dismissedAt: null,
					readAt: null,
				},
				orderBy: { createdAt: 'desc' },
				take,
			});
			return rows.map((row) => this.toDto(row));
		}

		// Inbox: unread first, then read — both groups by createdAt (not updatedAt).
		const [unread, read] = await Promise.all([
			this.prisma.notification.findMany({
				where: {
					userId,
					dismissedAt: null,
					readAt: null,
				},
				orderBy: { createdAt: 'desc' },
				take,
			}),
			this.prisma.notification.findMany({
				where: {
					userId,
					dismissedAt: null,
					readAt: { not: null },
				},
				orderBy: { createdAt: 'desc' },
				take,
			}),
		]);

		return [...unread, ...read]
			.slice(0, take)
			.map((row) => this.toDto(row));
	}

	async unreadCount(userId: string) {
		const count = await this.prisma.notification.count({
			where: {
				userId,
				dismissedAt: null,
				readAt: null,
			},
		});
		return { count };
	}

	async markRead(userId: string, id: string) {
		const existing = await this.prisma.notification.findFirst({
			where: { id, userId, dismissedAt: null },
		});
		if(!existing) {
			throw new NotFoundException('Notification not found.');
		}
		if(existing.readAt) {
			return this.toDto(existing);
		}
		const updated = await this.prisma.notification.update({
			where: { id },
			data: { readAt: new Date() },
		});
		return this.toDto(updated);
	}

	async markAllRead(userId: string) {
		const now = new Date();
		await this.prisma.notification.updateMany({
			where: {
				userId,
				dismissedAt: null,
				readAt: null,
			},
			data: { readAt: now },
		});
		return this.unreadCount(userId);
	}

	private toDto(row: {
		id: string;
		kind: string;
		title: string;
		body: string | null;
		href: string | null;
		payload: Prisma.JsonValue | null;
		readAt: Date | null;
		createdAt: Date;
	}): NotificationDto {
		return {
			id: row.id,
			kind: row.kind,
			title: row.title,
			body: row.body,
			href: row.href,
			payload: row.payload,
			readAt: row.readAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
		};
	}
}
