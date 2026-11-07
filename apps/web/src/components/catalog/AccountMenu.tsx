'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import {
	listNotifications,
	getUnreadNotificationCount,
	markAllNotificationsRead,
	notificationInboxHref,
	NOTIFICATIONS_INBOX_PATH,
	type NotificationDto,
} from '../../lib/notifications-api';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import {
	CatalogMenuLink,
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';

const buyerLinks = [
	{ href: '/auth/account', label: 'Account' },
	{ href: '/place-et-marque/orders', label: 'Orders' },
];

const sellerToolLinks = [
	{ href: '/place-et-marque/vendors', label: 'Vendors' },
	{ href: '/place-et-marque/manage', label: 'Manage listings' },
	{ href: '/place-et-marque/products/new', label: 'New product' },
];

const sellerSetupLinks = [
	{ href: '/place-et-marque/products/configure', label: 'Advanced product' },
	{ href: '/place-et-marque/uoms', label: 'UOMs' },
	{ href: '/place-et-marque/attributes', label: 'Attributes' },
	{ href: '/place-et-marque/categories', label: 'Categories' },
];

function accountLabel(email: string) {
	const at = email.indexOf('@');
	if(at <= 0) {
		return email;
	}
	return email.slice(0, at);
}

/** Fixed circle so counts never stretch into a pill over the caret. */
function UnreadBadge({
	count,
	className = '',
}: {
	count: number;
	className?: string;
}) {
	if(count <= 0) {
		return null;
	}
	const label = count > 99 ? '99+' : String(count);
	return (
		<span
			aria-hidden="true"
			className={
				`
					inline-flex
					size-4
					shrink-0
					aspect-square
					items-center
					justify-center
					rounded-full
					bg-signal
					text-[9px]
					font-semibold
					leading-none
					text-white
					${className}
				`.trim()
			}
		>
			{label}
		</span>
	);
}

function MenuDivider() {
	return (
		<div
			aria-hidden
			className="
				my-1
				border-t
				border-slate-100
			"
			role="separator"
		/>
	);
}

export function AccountMenu({
	email,
	onSignOut,
}: {
	email: string;
	onSignOut: () => void;
}) {
	const pathname = usePathname();
	const sellerChrome = pathUsesSellerChrome(pathname);
	const [notifications, setNotifications] = useState<NotificationDto[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationsLoading, setNotificationsLoading] = useState(false);

	const {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		align: 'end',
		minWidth: 260,
		preferredWidth: 288,
	});

	useEffect(() => {
		let cancelled = false;
		getUnreadNotificationCount()
			.then((result) => {
				if(!cancelled) {
					setUnreadCount(result.count);
				}
			})
			.catch(() => {
				if(!cancelled) {
					setUnreadCount(0);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if(!open) {
			return;
		}

		let cancelled = false;
		setNotificationsLoading(true);
		Promise.all([
			getUnreadNotificationCount(),
			listNotifications(20, { unreadOnly: true }),
		])
			.then(([countResult, rows]) => {
				if(cancelled) {
					return;
				}
				setUnreadCount(countResult.count);
				setNotifications(rows);
			})
			.catch(() => {
				if(cancelled) {
					return;
				}
				setNotifications([]);
			})
			.finally(() => {
				if(!cancelled) {
					setNotificationsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [open]);

	async function onMarkAllRead() {
		try {
			await markAllNotificationsRead();
			setUnreadCount(0);
			setNotifications([]);
		}
		catch {
			// Keep prior unread state when the request fails.
		}
	}

	function closeMenu() {
		setOpen(false);
	}

	const primaryLinks = sellerChrome
		? [
			{ href: '/auth/account', label: 'Account' },
			...sellerToolLinks,
			{ href: '/place-et-marque/orders', label: 'Orders' },
		]
		: [
			...buyerLinks,
			...sellerToolLinks,
		];

	const showUnreadList = unreadCount > 0 || notifications.length > 0;

	return (
		<div className="relative">
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={
					unreadCount > 0
						? `${accountLabel(email)} account menu, ${unreadCount} unread`
						: `${accountLabel(email)} account menu`
				}
				className="
					inline-flex
					max-w-[9rem]
					items-center
					gap-1
					overflow-visible
					text-slate-600
					hover:text-ink
					sm:max-w-[14rem]
				"
				onClick={() => setOpen((current) => !current)}
				ref={triggerRef}
				title={email}
				type="button"
			>
				<span
					className="
						relative
						min-w-0
						overflow-visible
						pr-2.5
					"
				>
					<span className="block truncate">
						{accountLabel(email)}
					</span>
					<UnreadBadge
						className="
							absolute
							-right-0.5
							-top-1.5
						"
						count={unreadCount}
					/>
				</span>
				<CaretDownIcon
					className={
						open
							? `
								h-3
								w-3
								shrink-0
								rotate-180
								text-slate-400
								transition
							`
							: `
								h-3
								w-3
								shrink-0
								text-slate-400
								transition
							`
					}
				/>
			</button>
			{open && panelBox
				? (
					<CatalogMenuSurface
						bodyClassName="
							max-h-[min(28rem,calc(100vh-2*var(--gutter)))]
							space-y-0.5
							overflow-y-auto
							scrollbar-thin-quiet
						"
						panelBox={panelBox}
						panelClassName="
							fixed
							z-50
							rounded-xl
							border
							border-slate-200
							bg-white
							p-1.5
							shadow-lg
						"
						panelRef={panelRef}
					>
						{primaryLinks.map((link) => (
							<CatalogMenuLink
								href={link.href}
								key={link.href}
								onClick={closeMenu}
							>
								<span className="truncate">
									{link.label}
								</span>
							</CatalogMenuLink>
						))}
						<MenuDivider />
						<CatalogMenuLink
							href={NOTIFICATIONS_INBOX_PATH}
							onClick={closeMenu}
						>
							<span className="truncate">
								Notifications
							</span>
							<UnreadBadge count={unreadCount} />
						</CatalogMenuLink>
						{showUnreadList
							? (
								<div
									className="
										flex
										flex-col
										gap-0.5
										px-1
										pb-1
									"
								>
									{unreadCount > 0
										? (
											<div
												className="
													flex
													items-center
													justify-end
													px-2
													pt-1
												"
											>
												<button
													className="
														relative
														z-10
														text-xs
														font-semibold
														text-asgreen
														hover:underline
													"
													onClick={() => {
														void onMarkAllRead();
													}}
													role="menuitem"
													type="button"
												>
													Mark all read
												</button>
											</div>
										)
										: null
									}
									{notificationsLoading
										? (
											<p
												className="
													px-2
													py-1
													text-xs
													text-slate-500
												"
											>
												Loading…
											</p>
										)
										: notifications.length === 0
											? unreadCount > 0
												? (
													<p
														className="
															px-2
															py-1
															text-xs
															text-slate-500
														"
													>
														Loading…
													</p>
												)
												: null
											: notifications.map((item) => (
												<a
													className="
														block
														w-full
														rounded-full
														bg-asgreen/10
														px-3.5
														py-1.5
														text-left
														text-sm
														font-semibold
														text-sky
														hover:bg-asgreen/15
													"
													href={notificationInboxHref(item.id)}
													key={item.id}
													onClick={closeMenu}
													role="menuitem"
												>
													<span className="block truncate">
														{item.title}
													</span>
												</a>
											))
									}
								</div>
							)
							: null
						}
						<MenuDivider />
						{sellerSetupLinks.map((link) => (
							<CatalogMenuLink
								href={link.href}
								key={link.href}
								onClick={closeMenu}
							>
								<span className="truncate">
									{link.label}
								</span>
							</CatalogMenuLink>
						))}
						<MenuDivider />
						<CatalogMenuRow
							onClick={() => {
								closeMenu();
								onSignOut();
							}}
						>
							<span
								className="
									truncate
									text-slate-500
								"
							>
								Sign out
							</span>
						</CatalogMenuRow>
					</CatalogMenuSurface>
				)
				: null
			}
		</div>
	);
}
