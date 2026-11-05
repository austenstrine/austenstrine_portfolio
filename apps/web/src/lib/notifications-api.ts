import { authedFetch } from './auth-api';

export type NotificationDto = {
	id: string;
	kind: string;
	title: string;
	body: string | null;
	href: string | null;
	payload: unknown;
	readAt: string | null;
	createdAt: string;
};

export const NOTIFICATIONS_INBOX_PATH = '/place-et-marque/notifications';

export function notificationInboxHref(id?: string) {
	if(!id) {
		return NOTIFICATIONS_INBOX_PATH;
	}
	return `${NOTIFICATIONS_INBOX_PATH}#${encodeURIComponent(id)}`;
}

async function notificationsRequest<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await authedFetch(`/notifications${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	const body = await response.json().catch(() => null);
	if(!response.ok) {
		const message = body?.message ?? 'Notifications request failed.';
		throw new Error(Array.isArray(message) ? message.join(' ') : message);
	}

	return body as T;
}

export function listNotifications(
	limit = 30,
	options?: { unreadOnly?: boolean },
) {
	const params = new URLSearchParams({ limit: String(limit) });
	if(options?.unreadOnly) {
		params.set('unreadOnly', '1');
	}
	return notificationsRequest<NotificationDto[]>(`?${params.toString()}`);
}

export function getUnreadNotificationCount() {
	return notificationsRequest<{ count: number }>('/unread-count');
}

export function markNotificationRead(id: string) {
	return notificationsRequest<NotificationDto>(`/${id}/read`, {
		method: 'POST',
	});
}

export function markAllNotificationsRead() {
	return notificationsRequest<{ count: number }>('/read-all', {
		method: 'POST',
	});
}
