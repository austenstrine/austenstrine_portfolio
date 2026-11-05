'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';
import { BellIcon } from '../../../components/icons/BellIcon';
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
					items-start
					justify-between
					gap-3
				"
			>
				<div
					className="
						flex
						min-w-0
						items-start
						gap-3
					"
				>
					<span
						className="
							mt-1
							inline-flex
							size-9
							shrink-0
							items-center
							justify-center
							rounded-full
							bg-sky/10
							text-sky
						"
					>
						<BellIcon className="h-4 w-4" />
					</span>
					<div className="min-w-0">
						<h1
							className="
								text-2xl
								font-semibold
								text-ink
							"
						>
							Notifications
						</h1>
						<p
							className="
								mt-1
								text-sm
								text-slate-600
							"
						>
							Unread first. Read items stay here for later.
						</p>
					</div>
				</div>
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
						Loading notifications…
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
									rounded-xl
									border
									border-dashed
									border-slate-200
									bg-white
									px-4
									py-8
									text-center
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
									flex
									flex-col
									gap-2
								"
							>
								{items.map((item) => {
									const isActive = item.id === activeId;
									const unread = !item.readAt;
									return (
										<li
											id={`notification-${item.id}`}
											key={item.id}
										>
											<article
												className={
													isActive
														? `
															rounded-xl
															border
															border-sky/40
															bg-sky/5
															px-4
															py-3
															shadow-sm
															ring-2
															ring-sky/20
														`
														: unread
															? `
																rounded-xl
																border
																border-asgreen/20
																bg-asgreen/10
																px-4
																py-3
															`
															: `
																rounded-xl
																border
																border-slate-200
																bg-white
																px-4
																py-3
															`
												}
											>
												<div
													className="
														flex
														flex-wrap
														items-baseline
														justify-between
														gap-2
													"
												>
													<h2
														className={
															unread
																? `
																	text-base
																	font-semibold
																	text-sky
																`
																: `
																	text-base
																	font-medium
																	text-ink
																`
														}
													>
														{item.title}
													</h2>
													<time
														className="
															text-xs
															text-slate-500
														"
														dateTime={item.createdAt}
													>
														{formatCreatedAt(item.createdAt)}
													</time>
												</div>
												{item.body
													? (
														<p
															className="
																mt-1.5
																text-sm
																text-slate-600
															"
														>
															{item.body}
														</p>
													)
													: null
												}
												{item.href
													? (
														<a
															className="
																mt-3
																inline-flex
																items-center
																gap-1.5
																text-sm
																font-semibold
																text-asgreen
																hover:underline
															"
															href={item.href}
															onClick={() => {
																if(unread) {
																	void markNotificationRead(item.id)
																		.then((updated) => {
																			setItems((current) =>
																				current.map((row) =>
																					row.id === updated.id
																						? updated
																						: row,
																				),
																			);
																		})
																		.catch(() => {
																			// Navigation still proceeds.
																		});
																}
															}}
														>
															Open
															<ArrowRightIcon
																className="
																	h-3.5
																	w-3.5
																"
															/>
														</a>
													)
													: null
												}
											</article>
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
			reason="Sign in to view your notifications."
			reasonKey="account"
		>
			<Suspense
				fallback={
					<p className="text-sm text-slate-500">
						Loading notifications…
					</p>
				}
			>
				<NotificationsInboxInner />
			</Suspense>
		</RequireAccess>
	);
}
