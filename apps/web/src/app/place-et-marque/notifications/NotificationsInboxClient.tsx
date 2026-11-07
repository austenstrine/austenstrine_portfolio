'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';
import {
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	type NotificationDto,
} from '../../../lib/notifications-api';

function formatCreatedAt(iso: string) {
	const date = new Date(iso);
	if(Number.isNaN(date.getTime())) {
		return '';
	}
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

function NotificationsInboxInner() {
	const [items, setItems] = useState<NotificationDto[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const markedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		listNotifications(50)
			.then((rows) => {
				if(!cancelled) {
					setItems(rows);
					setError(null);
				}
			})
			.catch((loadError) => {
				if(!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: 'Could not load notifications.',
					);
				}
			})
			.finally(() => {
				if(!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const syncHash = () => {
			const raw = window.location.hash.replace(/^#/, '');
			setActiveId(raw ? decodeURIComponent(raw) : null);
		};
		syncHash();
		window.addEventListener('hashchange', syncHash);
		return () => window.removeEventListener('hashchange', syncHash);
	}, []);

	useEffect(() => {
		if(!activeId || items.length === 0) {
			return;
		}
		const target = document.getElementById(`notification-${activeId}`);
		target?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});

		const row = items.find((item) => item.id === activeId);
		if(!row || row.readAt || markedRef.current.has(activeId)) {
			return;
		}
		markedRef.current.add(activeId);
		void markNotificationRead(activeId)
			.then((updated) => {
				setItems((current) =>
					current.map((item) =>
						item.id === updated.id
							? updated
							: item,
					),
				);
			})
			.catch(() => {
				markedRef.current.delete(activeId);
			});
	}, [activeId, items]);

	async function onMarkAllRead() {
		try {
			await markAllNotificationsRead();
			const now = new Date().toISOString();
			setItems((current) =>
				current.map((row) => ({
					...row,
					readAt: row.readAt ?? now,
				})),
			);
		}
		catch {
			// Keep prior unread state when the request fails.
		}
	}

	function applyRead(updated: NotificationDto) {
		setItems((current) =>
			current.map((row) =>
				row.id === updated.id
					? updated
					: row,
			),
		);
	}

	function markReadIfNeeded(item: NotificationDto) {
		if(item.readAt || markedRef.current.has(item.id)) {
			return;
		}
		markedRef.current.add(item.id);
		void markNotificationRead(item.id)
			.then(applyRead)
			.catch(() => {
				markedRef.current.delete(item.id);
			});
	}

	const unreadCount = items.filter((item) => !item.readAt).length;

	return (
		<div
			className="
				mx-auto
				w-full
				max-w-2xl
			"
		>
			<header
				className="
					flex
					flex-wrap
					items-center
					justify-between
					gap-3
				"
			>
				<h1
					className="
						text-2xl
						font-semibold
						text-ink
					"
				>
					Notifications
				</h1>
				{unreadCount > 0
					? (
						<button
							className="
								rounded-full
								border
								border-asgreen/30
								bg-asgreen/10
								px-3.5
								py-1.5
								text-sm
								font-semibold
								text-asgreen
								hover:bg-asgreen/15
							"
							onClick={() => {
								void onMarkAllRead();
							}}
							type="button"
						>
							Mark all read
						</button>
					)
					: null
				}
			</header>

			{loading
				? (
					<p
						className="
							mt-8
							text-sm
							text-slate-500
						"
					>
						Loading…
					</p>
				)
				: error
					? (
						<p
							className="
								mt-8
								text-sm
								text-rose-700
							"
						>
							{error}
						</p>
					)
					: items.length === 0
						? (
							<p
								className="
									mt-8
									text-sm
									text-slate-500
								"
							>
								No notifications yet.
							</p>
						)
						: (
							<ul
								className="
									mt-6
									divide-y
									divide-slate-200
									border-y
									border-slate-200
								"
							>
								{items.map((item) => {
									const isActive = item.id === activeId;
									const unread = !item.readAt;
									const rowClass = `
										flex
										w-full
										items-start
										gap-3
										px-1
										py-3
										text-left
										${isActive
											? 'bg-sky/5 ring-2 ring-inset ring-sky/25'
											: ''
										}
									`.trim();
									const inner = (
										<>
											<span
												aria-hidden="true"
												className={
													unread
														? `
															mt-2
															size-2
															shrink-0
															rounded-full
															bg-signal
														`
														: `
															mt-2
															size-2
															shrink-0
														`
												}
											/>
											<span className="min-w-0 flex-1">
												<span
													className="
														flex
														flex-wrap
														items-baseline
														justify-between
														gap-2
													"
												>
													<span
														className={
															unread
																? `
																	text-base
																	font-semibold
																	text-ink
																`
																: `
																	text-base
																	font-medium
																	text-ink
																`
														}
													>
														{item.title}
													</span>
													<time
														className="
															shrink-0
															text-xs
															text-slate-500
														"
														dateTime={item.createdAt}
													>
														{formatCreatedAt(item.createdAt)}
													</time>
												</span>
												{item.body
													? (
														<span
															className="
																mt-1
																block
																text-sm
																text-slate-600
															"
														>
															{item.body}
														</span>
													)
													: null
												}
											</span>
											{item.href
												? (
													<ArrowRightIcon
														className="
															mt-1.5
															h-3.5
															w-3.5
															shrink-0
															text-asgreen
														"
													/>
												)
												: null
											}
										</>
									);

									return (
										<li
											id={`notification-${item.id}`}
											key={item.id}
										>
											{item.href
												? (
													<a
														aria-current={
															isActive
																? 'true'
																: undefined
														}
														className={
															`${rowClass} hover:bg-slate-50`
														}
														href={item.href}
														onClick={() => {
															markReadIfNeeded(item);
														}}
													>
														{inner}
													</a>
												)
												: unread
													? (
														<button
															aria-current={
																isActive
																	? 'true'
																	: undefined
															}
															className={
																`${rowClass} hover:bg-slate-50`
															}
															onClick={() => {
																markReadIfNeeded(item);
															}}
															type="button"
														>
															{inner}
														</button>
													)
													: (
														<article
															aria-current={
																isActive
																	? 'true'
																	: undefined
															}
															className={rowClass}
														>
															{inner}
														</article>
													)
											}
										</li>
									);
								})}
							</ul>
						)
			}
		</div>
	);
}

export default function NotificationsInboxClient() {
	return (
		<RequireAccess
			reasonKey="notifications"
		>
			<Suspense
				fallback={
					<p className="text-sm text-slate-500">
						Loading…
					</p>
				}
			>
				<NotificationsInboxInner />
			</Suspense>
		</RequireAccess>
	);
}
