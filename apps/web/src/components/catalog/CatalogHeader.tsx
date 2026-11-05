'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { getCart } from '../../lib/checkout-api';
import {
	listNotifications,
	getUnreadNotificationCount,
	markAllNotificationsRead,
	markNotificationRead,
	type NotificationDto,
} from '../../lib/notifications-api';
import { useSession } from '../../lib/useSession';
import { BellIcon } from '../icons/BellIcon';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import { CartIcon } from '../icons/CartIcon';
import { CatalogCategoryBar } from './CatalogCategoryBar';
import { MarketplaceBrandLink } from './MarketplaceBrandLink';
import { SellerModeChip } from './SellerModeChip';
import { useCatalogSearch } from './CatalogSearchContext';
import { CatalogSearchField } from './CatalogSearchField';

const vendorToolLinks = [
	{ href: '/place-et-marque/vendors', label: 'Vendors' },
	{ href: '/place-et-marque/manage', label: 'Manage listings' },
	{ href: '/place-et-marque/products/new', label: 'New product' },
	{ href: '/place-et-marque/orders', label: 'Orders' },
];

const vendorSetupLinks = [
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

function UnreadBadge({ count }: { count: number }) {
	if(count <= 0) {
		return null;
	}
	const label = count > 99 ? '99+' : String(count);
	return (
		<span
			className="
				absolute
				-right-1
				-top-1
				min-w-4
				rounded-full
				bg-signal
				px-1
				text-center
				text-[10px]
				font-semibold
				leading-4
				text-white
			"
		>
			{label}
		</span>
	);
}

function AccountMenu({
	email,
	onSignOut,
}: {
	email: string;
	onSignOut: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notifications, setNotifications] = useState<NotificationDto[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

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
			setNotificationsOpen(false);
			return;
		}

		const onPointerDown = (event: PointerEvent) => {
			if(!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if(event.key === 'Escape') {
				setOpen(false);
			}
		};

		document.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	useEffect(() => {
		if(!open || !notificationsOpen) {
			return;
		}
		let cancelled = false;
		setNotificationsLoading(true);
		listNotifications(20)
			.then((rows) => {
				if(!cancelled) {
					setNotifications(rows);
				}
			})
			.catch(() => {
				if(!cancelled) {
					setNotifications([]);
				}
			})
			.finally(() => {
				if(!cancelled) {
					setNotificationsLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, notificationsOpen]);

	async function onOpenNotification(item: NotificationDto) {
		try {
			if(!item.readAt) {
				await markNotificationRead(item.id);
				setNotifications((current) =>
					current.map((row) =>
						row.id === item.id
							? { ...row, readAt: new Date().toISOString() }
							: row,
					),
				);
				setUnreadCount((current) => Math.max(0, current - 1));
			}
		}
		catch {
			// Navigation still proceeds when mark-read fails.
		}
		setOpen(false);
		if(item.href) {
			window.location.assign(item.href);
		}
	}

	async function onMarkAllRead() {
		try {
			await markAllNotificationsRead();
			setUnreadCount(0);
			setNotifications((current) =>
				current.map((row) => ({
					...row,
					readAt: row.readAt ?? new Date().toISOString(),
				})),
			);
		}
		catch {
			// Keep prior unread state when the request fails.
		}
	}

	return (
		<div
			className="relative"
			ref={rootRef}
		>
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={
					unreadCount > 0
						? `${accountLabel(email)} account menu, ${unreadCount} unread`
						: `${accountLabel(email)} account menu`
				}
				className="
					relative
					inline-flex
					max-w-[9rem]
					items-center
					gap-1
					pr-1
					text-slate-600
					hover:text-ink
					sm:max-w-[14rem]
				"
				onClick={() => setOpen((current) => !current)}
				title={email}
				type="button"
			>
				<span className="truncate">
					{accountLabel(email)}
				</span>
				<CaretDownIcon
					className={
						open
							? `
								h-3
								w-3
								shrink-0
								rotate-180
								transition
							`
							: `
								h-3
								w-3
								shrink-0
								transition
							`
					}
				/>
				<UnreadBadge count={unreadCount} />
			</button>
			{open
				? (
					<div
						className="
							absolute
							right-0
							z-20
							mt-2
							min-w-[16rem]
							max-w-[20rem]
							rounded-xl
							border
							border-slate-200
							bg-white
							p-3
							shadow-lg
						"
						role="menu"
					>
						<ul
							className="
								flex
								flex-col
								gap-2
							"
						>
							<li>
								<a
									className="
										text-ink
										hover:underline
									"
									href="/auth/account"
									onClick={() => setOpen(false)}
									role="menuitem"
								>
									Your account
								</a>
							</li>
							<li
								className="
									mt-1
									border-t
									border-slate-100
									pt-2
								"
							>
								<details
									onToggle={(event) => {
										setNotificationsOpen(
											(event.currentTarget as HTMLDetailsElement).open,
										);
									}}
									open={notificationsOpen}
								>
									<summary
										className="
											flex
											cursor-pointer
											list-none
											items-center
											gap-2
											text-[11px]
											font-semibold
											uppercase
											tracking-[0.16em]
											text-slate-500
											[&::-webkit-details-marker]:hidden
										"
									>
										<BellIcon
											className="
												h-3.5
												w-3.5
												shrink-0
												text-sky
											"
										/>
										<span className="flex-1">
											Notifications
										</span>
										{unreadCount > 0
											? (
												<span
													className="
														rounded-full
														bg-signal
														px-1.5
														text-[10px]
														font-semibold
														normal-case
														tracking-normal
														text-white
													"
												>
													{unreadCount > 99
														? '99+'
														: unreadCount
													}
												</span>
											)
											: null
										}
									</summary>
									<div
										className="
											mt-2
											flex
											flex-col
											gap-2
										"
									>
										{unreadCount > 0
											? (
												<button
													className="
														self-start
														text-xs
														font-semibold
														text-asgreen
														hover:underline
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
										{notificationsLoading
											? (
												<p className="text-xs text-slate-500">
													Loading…
												</p>
											)
											: notifications.length === 0
												? (
													<p className="text-xs text-slate-500">
														No notifications yet.
													</p>
												)
												: (
													<ul
														className="
															flex
															max-h-56
															flex-col
															gap-1
															overflow-y-auto
														"
													>
														{notifications.map((item) => (
															<li key={item.id}>
																<button
																	className={
																		item.readAt
																			? `
																				w-full
																				rounded-lg
																				px-2
																				py-1.5
																				text-left
																				hover:bg-frost
																			`
																			: `
																				w-full
																				rounded-lg
																				bg-asgreen/10
																				px-2
																				py-1.5
																				text-left
																				hover:bg-asgreen/15
																			`
																	}
																	onClick={() => {
																		void onOpenNotification(item);
																	}}
																	role="menuitem"
																	type="button"
																>
																	<span
																		className={
																			item.readAt
																				? `
																					block
																					text-sm
																					font-medium
																					text-ink
																				`
																				: `
																					block
																					text-sm
																					font-semibold
																					text-sky
																				`
																		}
																	>
																		{item.title}
																	</span>
																	{item.body
																		? (
																			<span
																				className="
																					mt-0.5
																					block
																					text-xs
																					text-slate-500
																					line-clamp-2
																				"
																			>
																				{item.body}
																			</span>
																		)
																		: null
																	}
																</button>
															</li>
														))}
													</ul>
												)
										}
									</div>
								</details>
							</li>
							<li
								className="
									mt-1
									border-t
									border-slate-100
									pt-2
									text-[11px]
									font-semibold
									uppercase
									tracking-[0.16em]
									text-slate-500
								"
							>
								Sell
							</li>
							{vendorToolLinks.map((link) => (
								<li key={link.href}>
									<a
										className="
											text-ink
											hover:underline
										"
										href={link.href}
										onClick={() => setOpen(false)}
										role="menuitem"
									>
										{link.label}
									</a>
								</li>
							))}
							<li
								className="
									mt-1
									border-t
									border-slate-100
									pt-2
								"
							>
								<details>
									<summary
										className="
											cursor-pointer
											text-[11px]
											font-semibold
											uppercase
											tracking-[0.16em]
											text-slate-500
										"
									>
										Catalog setup
									</summary>
									<ul
										className="
											mt-2
											flex
											flex-col
											gap-2
										"
									>
										{vendorSetupLinks.map((link) => (
											<li key={link.href}>
												<a
													className="
														text-ink
														hover:underline
													"
													href={link.href}
													onClick={() => setOpen(false)}
													role="menuitem"
												>
													{link.label}
												</a>
											</li>
										))}
									</ul>
								</details>
							</li>
							<li
								className="
									mt-1
									border-t
									border-slate-100
									pt-2
								"
							>
								<button
									className="
										text-slate-500
										hover:text-ink
									"
									onClick={() => {
										setOpen(false);
										onSignOut();
									}}
									role="menuitem"
									type="button"
								>
									Sign out
								</button>
							</li>
						</ul>
					</div>
				)
				: null
			}
		</div>
	);
}

function HeaderSearch({
	inputId,
	inputRef,
	setExtras,
}: {
	inputId: string;
	inputRef: RefObject<HTMLInputElement | null>;
	setExtras: (el: HTMLDivElement | null) => void;
}) {
	return (
		<div
			className="
				flex
				min-w-0
				flex-1
				flex-wrap
				items-center
				gap-2
			"
		>
			<CatalogSearchField
				inputId={inputId}
				inputRef={inputRef}
				showShortcut
			/>
			<div
				className="
					flex
					items-center
					gap-2
					empty:hidden
				"
				ref={setExtras}
			/>
		</div>
	);
}

const HEADER_SCROLL_DELTA = 8;
const HEADER_SHOW_TOP = 16;

export function CatalogHeader() {
	const pathname = usePathname();
	const {
		applyCategory,
		categories,
		category,
		extrasHost,
		headerDesktopRef,
		headerMobileRef,
		setHeaderDesktopExtras,
		setHeaderMobileExtras,
		setSellerTopContextHost,
	} = useCatalogSearch();
	const { user, loading, signOut } = useSession();
	const [cartCount, setCartCount] = useState(0);
	const [headerHeight, setHeaderHeight] = useState(0);
	const [bannerOffset, setBannerOffset] = useState(0);
	const [headerHidden, setHeaderHidden] = useState(false);
	const lastScrollY = useRef(0);
	const sellerChrome = pathUsesSellerChrome(pathname);
	const showDepartmentBar =
		!sellerChrome
		&& categories.length > 0
		&& pathname !== '/place-et-marque/search';
	const headerRef = useRef<HTMLElement>(null);

	useLayoutEffect(() => {
		const banner = document.querySelector('[data-maintenance-banner]');
		const syncBanner = () => {
			setBannerOffset(
				banner instanceof HTMLElement
					? banner.offsetHeight
					: 0,
			);
		};
		syncBanner();
		if(!(banner instanceof HTMLElement)) {
			return;
		}
		const observer = new ResizeObserver(syncBanner);
		observer.observe(banner);
		return () => observer.disconnect();
	}, []);

	useLayoutEffect(() => {
		const header = headerRef.current;
		if(!header) {
			return;
		}
		const sync = () => {
			const height = header.offsetHeight;
			setHeaderHeight(height);
			document.documentElement.style.setProperty(
				'--catalog-header-h',
				`${headerHidden ? 0 : height + bannerOffset}px`,
			);
		};
		sync();
		const observer = new ResizeObserver(sync);
		observer.observe(header);
		return () => {
			observer.disconnect();
			document.documentElement.style.removeProperty('--catalog-header-h');
		};
	}, [bannerOffset, headerHidden]);

	useEffect(() => {
		lastScrollY.current = window.scrollY;
		const onScroll = () => {
			const y = Math.max(0, window.scrollY);
			const delta = y - lastScrollY.current;
			if(y <= HEADER_SHOW_TOP) {
				setHeaderHidden(false);
				lastScrollY.current = y;
				return;
			}
			if(delta > HEADER_SCROLL_DELTA) {
				setHeaderHidden(true);
				lastScrollY.current = y;
			}
			else if(delta < -HEADER_SCROLL_DELTA) {
				setHeaderHidden(false);
				lastScrollY.current = y;
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useLayoutEffect(() => {
		lastScrollY.current = window.scrollY;
	}, [extrasHost]);

	useEffect(() => {
		if(!user || sellerChrome) {
			setCartCount(0);
			return;
		}
		getCart()
			.then((cart) => setCartCount(cart.lineCount ?? cart.lines.length))
			.catch(() => setCartCount(0));
	}, [user, sellerChrome]);

	return (
		<>
			<div
				aria-hidden="true"
				className={
					headerHeight > 0
						? undefined
						: 'h-[var(--catalog-header-h)]'
				}
				style={
					headerHeight > 0
						? { height: headerHeight + bannerOffset }
						: undefined
				}
			/>
			<header
				className="
					fixed
					inset-x-0
					z-30
					border-b
					border-slate-200
					bg-white/95
					backdrop-blur
					transition-transform
					duration-200
					ease-out
					motion-reduce:transition-none
				"
				data-hidden={headerHidden ? 'true' : 'false'}
				onFocusCapture={() => setHeaderHidden(false)}
				ref={headerRef}
				style={{
					top: bannerOffset,
					transform: headerHidden
						? 'translateY(-100%)'
						: 'translateY(0)',
				}}
			>
				<div
					className="
						mx-auto
						flex
						max-w-7xl
						flex-col
						gap-3
						px-gutter
						py-3
					"
				>
					<div
						className="
							flex
							items-center
							gap-3
						"
					>
						<MarketplaceBrandLink />
						{sellerChrome
							? <SellerModeChip />
							: null
						}
						<div className="hidden min-w-0 flex-1 md:flex">
							<HeaderSearch
								inputId="store-search-desktop"
								inputRef={headerDesktopRef}
								setExtras={setHeaderDesktopExtras}
							/>
						</div>
						<nav
							className="
								ml-auto
								flex
								shrink-0
								items-center
								gap-2
								text-sm
								font-semibold
								sm:gap-3
							"
						>
							{sellerChrome
								? null
								: (
									<a
										className="
											relative
											inline-flex
											h-10
											w-10
											items-center
											justify-center
											rounded-full
											text-ink
											hover:bg-frost
										"
										href="/place-et-marque/cart"
									>
										<CartIcon />
										<span className="sr-only">Cart</span>
										{cartCount > 0
											? (
												<span
													className="
														absolute
														right-0.5
														top-0.5
														min-w-4
														rounded-full
														bg-signal
														px-1
														text-center
														text-[10px]
														font-semibold
														leading-4
														text-white
													"
												>
													{cartCount}
												</span>
											)
											: null
										}
									</a>
								)
							}
							{loading
								? null
								: user
									? (
										<AccountMenu
											email={user.email}
											onSignOut={() => {
												void signOut().then(() => {
													window.location.reload();
												});
											}}
										/>
									)
									: (
										<a
											className="
												rounded-full
												bg-asgreen
												px-3.5
												py-2
												text-white
												hover:bg-asgreen/90
											"
											href="/auth/login"
										>
											Sign in
										</a>
									)
							}
						</nav>
					</div>
					<div className="md:hidden">
						<HeaderSearch
							inputId="store-search-mobile"
							inputRef={headerMobileRef}
							setExtras={setHeaderMobileExtras}
						/>
					</div>
				</div>
				{sellerChrome
					? (
						<div
							className="
								border-t
								border-slate-100
								bg-white
								empty:hidden
							"
							ref={setSellerTopContextHost}
						/>
					)
					: showDepartmentBar
						? (
							<CatalogCategoryBar
								categories={categories}
								category={category}
								onChoose={applyCategory}
							/>
						)
						: null
				}
			</header>
		</>
	);
}
