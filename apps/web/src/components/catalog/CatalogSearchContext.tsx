'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

function isVisible(el: HTMLElement | null) {
	if(!el) {
		return false;
	}
	return el.getClientRects().length > 0;
}

type CatalogSearchContextValue = {
	query: string;
	setQuery: (value: string) => void;
	committedQuery: string;
	setCommittedQuery: (value: string) => void;
	submit: () => void;
	headerDesktopRef: RefObject<HTMLInputElement | null>;
	headerMobileRef: RefObject<HTMLInputElement | null>;
	pageInputRef: RefObject<HTMLInputElement | null>;
	extrasHost: 'page' | 'header';
	setPageDock: (el: HTMLElement | null) => void;
	setHeaderDesktopExtras: (el: HTMLDivElement | null) => void;
	setHeaderMobileExtras: (el: HTMLDivElement | null) => void;
	setPageExtras: (el: HTMLDivElement | null) => void;
	headerDesktopExtrasEl: HTMLDivElement | null;
	headerMobileExtrasEl: HTMLDivElement | null;
	pageExtrasEl: HTMLDivElement | null;
	desktop: boolean;
};

const CatalogSearchContext = createContext<CatalogSearchContextValue | null>(null);

export function CatalogSearchProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const [query, setQuery] = useState('');
	const [committedQuery, setCommittedQuery] = useState('');
	const headerDesktopRef = useRef<HTMLInputElement>(null);
	const headerMobileRef = useRef<HTMLInputElement>(null);
	const pageInputRef = useRef<HTMLInputElement>(null);
	const [pageDock, setPageDock] = useState<HTMLElement | null>(null);
	const [headerDesktopExtrasEl, setHeaderDesktopExtras] = useState<HTMLDivElement | null>(null);
	const [headerMobileExtrasEl, setHeaderMobileExtras] = useState<HTMLDivElement | null>(null);
	const [pageExtrasEl, setPageExtras] = useState<HTMLDivElement | null>(null);
	const [extrasHost, setExtrasHost] = useState<'page' | 'header'>(
		() => (pathname === '/place-et-marque/search' ? 'page' : 'header'),
	);
	const [desktop, setDesktop] = useState(false);

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
	}, [pathname, query, router]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const typing = event.target instanceof HTMLInputElement
				|| event.target instanceof HTMLTextAreaElement
				|| event.target instanceof HTMLSelectElement;
			if(event.key !== '/' || typing) {
				return;
			}
			event.preventDefault();
			const header = desktop
				? headerDesktopRef.current
				: headerMobileRef.current;
			const target = isVisible(header)
				? header
				: pageInputRef.current;
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
		headerDesktopRef,
		headerMobileRef,
		pageInputRef,
		extrasHost,
		setPageDock,
		setHeaderDesktopExtras,
		setHeaderMobileExtras,
		setPageExtras,
		headerDesktopExtrasEl,
		headerMobileExtrasEl,
		pageExtrasEl,
		desktop,
	}), [
		query,
		committedQuery,
		submit,
		extrasHost,
		headerDesktopExtrasEl,
		headerMobileExtrasEl,
		pageExtrasEl,
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

export function SearchExtrasPortal({ children }: { children: ReactNode }) {
	const {
		desktop,
		extrasHost,
		headerDesktopExtrasEl,
		headerMobileExtrasEl,
		pageExtrasEl,
	} = useCatalogSearch();

	const headerEl = desktop ? headerDesktopExtrasEl : headerMobileExtrasEl;
	const target = extrasHost === 'page' ? pageExtrasEl : headerEl;
	if(!target) {
		return children;
	}
	return createPortal(children, target);
}
