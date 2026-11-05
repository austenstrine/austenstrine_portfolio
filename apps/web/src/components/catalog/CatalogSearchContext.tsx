'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import {
	listCatalogCategories,
	type CatalogCategoryRow,
} from '../../lib/catalog-api';
import {
	sortCategoryTree,
	type CategoryTreeRow,
} from '../../lib/category-tree';

type CatalogSearchContextValue = {
	query: string;
	setQuery: (value: string) => void;
	committedQuery: string;
	setCommittedQuery: (value: string) => void;
	submit: () => void;
	category: string;
	setCategory: (slug: string) => void;
	syncCategory: (slug: string) => void;
	applyCategory: (slug: string) => void;
	categories: CatalogCategoryRow[];
	categoryTree: CategoryTreeRow<CatalogCategoryRow>[];
	categoryOptions: CategoryTreeRow<CatalogCategoryRow>[];
	headerDesktopRef: RefObject<HTMLInputElement | null>;
	headerMobileRef: RefObject<HTMLInputElement | null>;
	extrasHost: 'page' | 'header';
	setPageDock: (el: HTMLElement | null) => void;
	setHeaderDesktopExtras: (el: HTMLDivElement | null) => void;
	setHeaderMobileExtras: (el: HTMLDivElement | null) => void;
	setPageExtras: (el: HTMLDivElement | null) => void;
	headerDesktopExtrasEl: HTMLDivElement | null;
	headerMobileExtrasEl: HTMLDivElement | null;
	pageExtrasEl: HTMLDivElement | null;
	pageTopBarHostEl: HTMLDivElement | null;
	setPageTopBarHost: (el: HTMLDivElement | null) => void;
	desktop: boolean;
};

const CatalogSearchContext = createContext<CatalogSearchContextValue | null>(null);

export function CatalogSearchProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const [query, setQuery] = useState('');
	const [committedQuery, setCommittedQuery] = useState('');
	const [category, setCategoryState] = useState('');
	const [categories, setCategories] = useState<CatalogCategoryRow[]>([]);
	const headerDesktopRef = useRef<HTMLInputElement>(null);
	const headerMobileRef = useRef<HTMLInputElement>(null);
	const [pageDock, setPageDock] = useState<HTMLElement | null>(null);
	const [headerDesktopExtrasEl, setHeaderDesktopExtras] = useState<HTMLDivElement | null>(null);
	const [headerMobileExtrasEl, setHeaderMobileExtras] = useState<HTMLDivElement | null>(null);
	const [pageExtrasEl, setPageExtras] = useState<HTMLDivElement | null>(null);
	const [pageTopBarHostEl, setPageTopBarHost] = useState<HTMLDivElement | null>(null);
	const [extrasHost, setExtrasHost] = useState<'page' | 'header'>(
		() => (pathname === '/place-et-marque/search' ? 'page' : 'header'),
	);
	const [desktop, setDesktop] = useState(false);
	const categoryTree = useMemo(() => sortCategoryTree(categories), [categories]);

	useEffect(() => {
		listCatalogCategories()
			.then((rows) => setCategories(rows))
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		setExtrasHost(pathname === '/place-et-marque/search' ? 'page' : 'header');
	}, [pathname]);

	useEffect(() => {
		const media = window.matchMedia('(min-width: 768px)');
		const sync = () => setDesktop(media.matches);
		sync();
		media.addEventListener('change', sync);
		return () => media.removeEventListener('change', sync);
	}, []);

	useEffect(() => {
		if(!pageDock) {
			if(pathname !== '/place-et-marque/search') {
				setExtrasHost('header');
			}
			return;
		}
		setExtrasHost('page');
		const observer = new IntersectionObserver(
			([entry]) => {
				const visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
				setExtrasHost(visible ? 'page' : 'header');
			},
			{
				root: null,
				rootMargin: '-132px 0px 0px 0px',
				threshold: [0, 0.35, 1],
			},
		);
		observer.observe(pageDock);
		return () => observer.disconnect();
	}, [pageDock, pathname]);

	const syncCategory = useCallback((slug: string) => {
		setCategoryState(slug);
	}, []);
	const setCategory = syncCategory;

	const applyCategory = useCallback((slug: string) => {
		setCategoryState(slug);
		const onSearch = pathname === '/place-et-marque/search';
		const params = new URLSearchParams(onSearch ? window.location.search : '');
		const nextQuery = query.trim();
		if(nextQuery) {
			params.set('q', nextQuery);
		}
		else {
			params.delete('q');
		}
		if(slug) {
			params.set('category', slug);
		}
		else {
			params.delete('category');
		}
		params.delete('page');
		const next = params.toString();
		const href = next
			? `/place-et-marque/search?${next}`
			: '/place-et-marque/search';
		if(`${window.location.pathname}${window.location.search}` === href) {
			return;
		}
		router.push(href, { scroll: false });
	}, [pathname, query, router]);

	const submit = useCallback(() => {
		const nextQuery = query.trim();
		const onSearch = pathname === '/place-et-marque/search';
		const params = new URLSearchParams(onSearch ? window.location.search : '');
		if(nextQuery) {
			params.set('q', nextQuery);
		}
		else {
			params.delete('q');
		}
		if(category) {
			params.set('category', category);
		}
		else {
			params.delete('category');
		}
		if(onSearch) {
			params.delete('page');
		}
		const next = params.toString();
		const href = next
			? `/place-et-marque/search?${next}`
			: '/place-et-marque/search';
		if(`${window.location.pathname}${window.location.search}` === href) {
			return;
		}
		router.push(href, { scroll: false });
	}, [category, pathname, query, router]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const typing = event.target instanceof HTMLInputElement
				|| event.target instanceof HTMLTextAreaElement
				|| event.target instanceof HTMLSelectElement;
			if(event.key !== '/' || typing) {
				return;
			}
			event.preventDefault();
			const target = desktop
				? headerDesktopRef.current
				: headerMobileRef.current;
			target?.focus();
			target?.select();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [desktop]);

	const value = useMemo(() => ({
		query,
		setQuery,
		committedQuery,
		setCommittedQuery,
		submit,
		category,
		setCategory,
		syncCategory,
		applyCategory,
		categories,
		categoryTree,
		categoryOptions: categoryTree,
		headerDesktopRef,
		headerMobileRef,
		extrasHost,
		setPageDock,
		setHeaderDesktopExtras,
		setHeaderMobileExtras,
		setPageExtras,
		headerDesktopExtrasEl,
		headerMobileExtrasEl,
		pageExtrasEl,
		pageTopBarHostEl,
		setPageTopBarHost,
		desktop,
	}), [
		query,
		committedQuery,
		submit,
		category,
		setCategory,
		syncCategory,
		applyCategory,
		categories,
		categoryTree,
		extrasHost,
		headerDesktopExtrasEl,
		headerMobileExtrasEl,
		pageExtrasEl,
		pageTopBarHostEl,
		desktop,
	]);

	return (
		<CatalogSearchContext.Provider value={value}>
			{children}
		</CatalogSearchContext.Provider>
	);
}

export function useCatalogSearch() {
	const value = useContext(CatalogSearchContext);
	if(!value) {
		throw new Error('useCatalogSearch requires CatalogSearchProvider');
	}
	return value;
}

function clampDelta(value: number) {
	return Math.max(-36, Math.min(36, value));
}

export function SearchExtrasPortal({ children }: { children: ReactNode }) {
	const {
		desktop,
		extrasHost,
		headerDesktopExtrasEl,
		headerMobileExtrasEl,
		pageExtrasEl,
	} = useCatalogSearch();
	const wrapRef = useRef<HTMLDivElement>(null);
	const prevRectRef = useRef<DOMRect | null>(null);
	const prevHostRef = useRef(extrasHost);

	const headerEl = desktop ? headerDesktopExtrasEl : headerMobileExtrasEl;
	const target = extrasHost === 'page' ? pageExtrasEl : headerEl;

	useLayoutEffect(() => {
		const el = wrapRef.current;
		if(!el) {
			return;
		}
		const last = el.getBoundingClientRect();
		const first = prevRectRef.current;
		const moved = prevHostRef.current !== extrasHost;
		prevHostRef.current = extrasHost;
		prevRectRef.current = last;

		if(!moved || !first || first.width < 1 || last.width < 1) {
			return;
		}
		if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		const dx = clampDelta(first.left - last.left);
		const dy = clampDelta(first.top - last.top);
		if(Math.abs(dx) < 1 && Math.abs(dy) < 1) {
			return;
		}

		for(const animation of el.getAnimations()) {
			animation.cancel();
		}
		el.animate(
			[
				{
					opacity: 0.35,
					transform: `translate(${dx}px, ${dy}px)`,
				},
				{
					opacity: 1,
					transform: 'translate(0, 0)',
				},
			],
			{
				duration: 220,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
			},
		);
	}, [extrasHost, target]);

	const content = (
		<div
			className="
				flex
				items-center
				gap-2
			"
			ref={wrapRef}
		>
			{children}
		</div>
	);

	if(!target) {
		return content;
	}
	return createPortal(content, target);
}

/** Page-specific actions for the header row that replaces the category bar on seller pages. */
export function PageTopBarPortal({ children }: { children: ReactNode }) {
	const { pageTopBarHostEl } = useCatalogSearch();
	if(!pageTopBarHostEl) {
		return null;
	}
	return createPortal(
		<div
			aria-label="Page actions"
			className="
				mx-auto
				flex
				max-w-7xl
				flex-wrap
				items-center
				gap-x-3
				gap-y-2
				px-gutter
				py-2
			"
			role="region"
		>
			{children}
		</div>,
		pageTopBarHostEl,
	);
}
