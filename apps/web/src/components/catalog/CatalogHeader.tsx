'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { getCart } from '../../lib/checkout-api';
import {
	listNotifications,
	getUnreadNotificationCount,
	markAllNotificationsRead,
	notificationInboxHref,
	NOTIFICATIONS_INBOX_PATH,
	type NotificationDto,
} from '../../lib/notifications-api';
import { useSession } from '../../lib/useSession';
import { BellIcon } from '../icons/BellIcon';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import { CartIcon } from '../icons/CartIcon';
import { CatalogCategoryBar } from './CatalogCategoryBar';
import {
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';
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

function sectionCaretClass(expanded: boolean) {
	return expanded
		? `
			h-3
			w-3
			shrink-0
			rotate-180
			transition
			text-slate-400
		`
		: `
			h-3
			w-3
			shrink-0
			transition
			text-slate-400
		`;
}

function AccountMenu({
	email,
	onSignOut,
}: {
	email: string;
	onSignOut: () => void;
}) {
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [catalogSetupOpen, setCatalogSetupOpen] = useState(false);
	const [notifications, setNotifications] = useState<NotificationDto[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const notificationsOpenRef = useRef(notificationsOpen);
	const catalogSetupOpenRef = useRef(catalogSetupOpen);
	notificationsOpenRef.current = notificationsOpen;
	catalogSetupOpenRef.current = catalogSetupOpen;

	const {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		align: 'end',
		minWidth: 288,
		preferredWidth: 320,
		onEscape: () => {
			if(catalogSetupOpenRef.current) {
				setCatalogSetupOpen(false);
				return true;
			}
			if(notificationsOpenRef.current) {
				setNotificationsOpen(false);
				return true;
			}
			return false;
		},
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
			setNotificationsOpen(false);
			setCatalogSetupOpen(false);
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
				if(countResult.count > 0) {
					setNotificationsOpen(true);
				}
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
					className={sectionCaretClass(open)}
				/>
			</button>
			{open && panelBox
				? (
					<CatalogMenuSurface
						bodyClassName="
							max-h-[min(28rem,calc(100vh-2*var(--gutter)))]
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
							p-3
							shadow-lg
						"
						panelRef={panelRef}
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
									onClick={closeMenu}
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
								<button
									aria-expanded={notificationsOpen}
									className="
										flex
										w-full
										cursor-pointer
										items-center
										gap-2
										text-left
										text-[11px]
										font-semibold
										uppercase
										tracking-[0.16em]
										text-slate-500
									"
									onClick={() =>
										setNotificationsOpen((current) => !current)
									}
									role="menuitem"
									type="button"
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
									<UnreadBadge count={unreadCount} />
									<CaretDownIcon
										className={sectionCaretClass(notificationsOpen)}
									/>
								</button>
								<a
									className="
										mt-2
										inline-block
										text-xs
										font-semibold
										text-sky
										hover:underline
									"
									href={NOTIFICATIONS_INBOX_PATH}
									onClick={closeMenu}
									role="menuitem"
								>
									Open inbox
								</a>
								{notificationsOpen
									? (
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
															relative
															z-10
															self-start
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
															{unreadCount > 0
																? 'Loading…'
																: 'No unread notifications.'
															}
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
																	<a
																		className="
																			block
																			w-full
																			rounded-lg
																			bg-asgreen/10
																			px-2
																			py-1.5
																			text-left
																			hover:bg-asgreen/15
																		"
																		href={notificationInboxHref(item.id)}
																		onClick={closeMenu}
																		role="menuitem"
																	>
																		<span
																			className="
																				block
																				truncate
																				text-sm
																				font-semibold
																				text-sky
																			"
																		>
																			{item.title}
																		</span>
																		{item.body
																			? (
																				<span
																					className="
																						mt-0.5
																						block
																						truncate
																						text-xs
																						text-slate-500
																					"
																				>
																					{item.body}
																				</span>
																			)
																			: null
																		}
																	</a>
																</li>
															))}
														</ul>
													)
											}
										</div>
									)
									: null
								}
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
										onClick={closeMenu}
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
								<button
									aria-expanded={catalogSetupOpen}
									className="
										flex
										w-full
										cursor-pointer
										items-center
										gap-2
										text-left
										text-[11px]
										font-semibold
										uppercase
										tracking-[0.16em]
										text-slate-500
									"
									onClick={() =>
										setCatalogSetupOpen((current) => !current)
									}
									role="menuitem"
									type="button"
								>
									<span className="flex-1">
										Catalog setup
									</span>
									<CaretDownIcon
										className={sectionCaretClass(catalogSetupOpen)}
									/>
								</button>
								{catalogSetupOpen
									? (
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
														onClick={closeMenu}
														role="menuitem"
													>
														{link.label}
													</a>
												</li>
											))}
										</ul>
									)
									: null
								}
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
										closeMenu();
										onSignOut();
									}}
									role="menuitem"
									type="button"
								>
									Sign out
								</button>
							</li>
						</ul>
					</CatalogMenuSurface>
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
