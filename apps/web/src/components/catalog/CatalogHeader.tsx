'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { getCart } from '../../lib/checkout-api';
import { listCatalogCategories, type CatalogCategoryRow } from '../../lib/catalog-api';
import { sortCategoryTree } from '../../lib/category-tree';
import { useSession } from '../../lib/useSession';
import { CartIcon } from '../icons/CartIcon';
import { MarketplaceBrandLink } from './MarketplaceBrandLink';
import { useCatalogSearch } from './CatalogSearchContext';
import { CatalogSearchField } from './CatalogSearchField';

const vendorToolLinks = [
	{ href: '/place-et-marque/vendors', label: 'Vendors' },
	{ href: '/place-et-marque/manage', label: 'Manage listings' },
	{ href: '/place-et-marque/products/new', label: 'New product' },
	{ href: '/place-et-marque/products/configure', label: 'Advanced product' },
	{ href: '/place-et-marque/orders', label: 'Orders' },
	{ href: '/place-et-marque/uoms', label: 'UOMs' },
	{ href: '/place-et-marque/attributes', label: 'Attributes' },
	{ href: '/place-et-marque/categories', label: 'Categories' },
];

function SellMenu() {
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
			className="
				relative
				hidden
				lg:block
			"
			ref={rootRef}
		>
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				className="
					text-slate-600
					hover:text-ink
				"
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				Sell
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
				variant="header"
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

export function CatalogHeader() {
	const {
		headerDesktopRef,
		headerMobileRef,
		setHeaderDesktopExtras,
		setHeaderMobileExtras,
	} = useCatalogSearch();
	const { user, loading, signOut } = useSession();
	const [cartCount, setCartCount] = useState(0);
	const [departments, setDepartments] = useState<CatalogCategoryRow[]>([]);

	useEffect(() => {
		listCatalogCategories()
			.then((rows) => {
				setDepartments(
					sortCategoryTree(rows).filter((row) => row.depth === 0),
				);
			})
			.catch(() => undefined);
	}, []);

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
		<header
			className="
				sticky
				top-0
				z-30
				border-b
				border-slate-200
				bg-white/95
				backdrop-blur
			"
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
						{!loading && user
							? <SellMenu />
							: null
						}
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
									<span
										className="
											flex
											items-center
											gap-3
										"
									>
										<a
											className="
												text-slate-600
												hover:text-ink
											"
											href="/auth/account"
										>
											Account
										</a>
										<button
											className="
												hidden
												text-slate-500
												hover:text-ink
												sm:inline
											"
											type="button"
											onClick={() => {
												void signOut().then(() => {
													window.location.reload();
												});
											}}
										>
											Sign out
										</button>
									</span>
								)
								: (
									<a
										className="
											rounded-full
											bg-ink
											px-3.5
											py-2
											text-white
											hover:bg-sky
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
			{departments.length > 0
				? (
					<nav
						aria-label="Shop by department"
						className="
							hidden
							border-t
							border-slate-100
							bg-white
							md:block
						"
					>
						<div
							className="
								mx-auto
								flex
								max-w-7xl
								gap-1
								overflow-x-auto
								px-gutter
								py-2
								text-[13px]
								font-semibold
								[scrollbar-width:none]
								[&::-webkit-scrollbar]:hidden
							"
						>
							<a
								className="
									shrink-0
									rounded-full
									px-3
									py-1.5
									text-ink
									hover:bg-frost
								"
								href="/place-et-marque/search"
							>
								All
							</a>
							{departments.map((row) => (
								<a
									className="
										shrink-0
										rounded-full
										px-3
										py-1.5
										text-slate-600
										hover:bg-frost
										hover:text-ink
									"
									href={`/place-et-marque/search?category=${encodeURIComponent(row.slug)}`}
									key={row.id}
								>
									{row.name}
								</a>
							))}
						</div>
					</nav>
				)
				: null
			}
		</header>
	);
}
