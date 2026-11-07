'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { getCart } from '../../lib/checkout-api';
import { useSession } from '../../lib/useSession';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import { CartIcon } from '../icons/CartIcon';
import { AccountMenu } from './AccountMenu';
import { CatalogCategoryBar } from './CatalogCategoryBar';
import { useEditableVendors } from './EditableVendorsProvider';
import { HeaderPortraitLink } from './HeaderPortraitLink';
import { InPlaceEditToggle } from './InPlaceProductFields';
import { MarketplaceBrandLink } from './MarketplaceBrandLink';
import { SellerModeChip } from './SellerModeChip';
import { syncSiteTopBanners } from '../../lib/site-top-banners';
import { useCatalogSearch } from './CatalogSearchContext';
import { CatalogSearchField } from './CatalogSearchField';

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
		categoriesReady,
		category,
		extrasHost,
		headerDesktopRef,
		headerMobileRef,
		setHeaderDesktopExtras,
		setHeaderMobileExtras,
		setSellerTopContextHost,
	} = useCatalogSearch();
	const { user, loading, signOut } = useSession();
	const {
		editableVendorIds,
		editTier,
		ready: editableVendorsReady,
		setEditTier,
	} = useEditableVendors();
	const [cartCount, setCartCount] = useState(0);
	const [headerHeight, setHeaderHeight] = useState(0);
	const [bannerOffset, setBannerOffset] = useState(0);
	const [headerHidden, setHeaderHidden] = useState(false);
	const lastScrollY = useRef(0);
	const sellerChrome = pathUsesSellerChrome(pathname);
	const showInPlaceEditToggle = !sellerChrome
		&& editableVendorsReady
		&& editableVendorIds.size > 0;
	// Buyer chrome (incl. /place-et-marque/<vendor>) keeps the department bar.
	// Search hides it — filters live on the page instead.
	const wantDepartmentBar =
		!sellerChrome
		&& pathname !== '/place-et-marque/search';
	const showDepartmentBar =
		wantDepartmentBar
		&& categories.length > 0;
	// Hold the bar's height while categories load so the late insert does not
	// shove main content. Collapse only after a settled empty fetch.
	const reserveDepartmentBar =
		wantDepartmentBar
		&& !showDepartmentBar
		&& !categoriesReady;
	const headerRef = useRef<HTMLElement>(null);

	useLayoutEffect(() => {
		const syncBanner = () => {
			setBannerOffset(syncSiteTopBanners());
		};
		syncBanner();
		const resizeObserver = new ResizeObserver(syncBanner);
		const observeAll = () => {
			resizeObserver.disconnect();
			document
				.querySelectorAll('[data-maintenance-banner]')
				.forEach((node) => {
					if(node instanceof HTMLElement) {
						resizeObserver.observe(node);
					}
				});
		};
		observeAll();
		// BackendDown mounts after /health — catch late inserts.
		const mutationObserver = new MutationObserver(() => {
			observeAll();
			syncBanner();
		});
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, []);

	useLayoutEffect(() => {
		const header = headerRef.current;
		if(!header) {
			return;
		}
		const sync = () => {
			const height = header.offsetHeight;
			setHeaderHeight(height);
			// Sticky filters use viewport top — include banner band. Body
			// padding-top already clears banners for in-flow content; spacer
			// below is headerHeight only.
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
						? { height: headerHeight }
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
				<HeaderPortraitLink />
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
						{showInPlaceEditToggle
							? (
								<InPlaceEditToggle
									className="hidden shrink-0 md:inline-flex"
									onChange={setEditTier}
									tier={editTier}
								/>
							)
							: null
						}
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
								? (
									<span
										aria-hidden
										className="
											invisible
											inline-flex
											min-h-9
											items-center
											gap-1
											text-sm
											font-semibold
										"
									>
										<span>Account</span>
										<CaretDownIcon
											className="
												h-3
												w-3
												shrink-0
												text-slate-400
											"
										/>
									</span>
								)
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
						<div
							className="
								flex
								min-w-0
								flex-wrap
								items-center
								gap-2
							"
						>
							<HeaderSearch
								inputId="store-search-mobile"
								inputRef={headerMobileRef}
								setExtras={setHeaderMobileExtras}
							/>
							{showInPlaceEditToggle
								? (
									<InPlaceEditToggle
										className="shrink-0"
										onChange={setEditTier}
										tier={editTier}
									/>
								)
								: null
							}
						</div>
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
						: reserveDepartmentBar
							? (
								<div
									aria-hidden
									className="
										hidden
										h-12
										border-t
										border-slate-100
										bg-white
										md:block
									"
								/>
							)
							: null
				}
			</header>
		</>
	);
}
