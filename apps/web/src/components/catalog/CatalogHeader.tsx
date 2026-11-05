'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { getCart } from '../../lib/checkout-api';
import { useSession } from '../../lib/useSession';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import { CartIcon } from '../icons/CartIcon';
import { CatalogCategoryBar } from './CatalogCategoryBar';
import { MarketplaceBrandLink } from './MarketplaceBrandLink';
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

function AccountMenu({
	email,
	onSignOut,
}: {
	email: string;
	onSignOut: () => void;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if(!open) {
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

	return (
		<div
			className="relative"
			ref={rootRef}
		>
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={`${accountLabel(email)} account menu`}
				className="
					inline-flex
					max-w-[9rem]
					items-center
					gap-1
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
			</button>
			{open
				? (
					<div
						className="
							absolute
							right-0
							z-20
							mt-2
							min-w-[12rem]
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
		if(!user) {
			setCartCount(0);
			return;
		}
		getCart()
			.then((cart) => setCartCount(cart.lineCount ?? cart.lines.length))
			.catch(() => setCartCount(0));
	}, [user]);

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
