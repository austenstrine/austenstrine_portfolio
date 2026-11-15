'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
	pathKeepsManageBottomPane,
	pathReservesOrdersListBottomPane,
	pathUsesSellerChrome,
} from '../../lib/accessGate';
import { useCatalogSearch } from './CatalogSearchContext';

const STACK_VAR = '--seller-bottom-pane-stack';
const STACK_GAP_PX = 8;
const PANE_SCROLL_DELTA = 8;
const PANE_SHOW_TOP = 16;
/** Matches orders filter labels + controls (+ pane pad) before portal fill. */
const ORDERS_PANE_RESERVE_CLASSNAME = `
	min-h-[4.75rem]
	empty:pointer-events-none
	empty:border-transparent
	empty:bg-transparent
	empty:shadow-none
`;

/**
 * Manage-only: keep geometry mounted while empty (transparent clickthrough).
 * When portal marks data-pane-filled=true, opacity fades up and pointer-events
 * turn on immediately (Tailwind has-; not gated on transition end).
 */
const MANAGE_HARVEST_PANE_CLASSNAME = `
	min-h-[3.5rem]
	border-transparent
	bg-transparent
	opacity-0
	pointer-events-none
	shadow-none
	transition-[opacity,background-color,border-color,box-shadow,transform]
	duration-200
	ease-out
	motion-reduce:transition-none
	has-[[data-pane-filled=true]]:border-slate-200
	has-[[data-pane-filled=true]]:bg-white/95
	has-[[data-pane-filled=true]]:opacity-100
	has-[[data-pane-filled=true]]:pointer-events-auto
	has-[[data-pane-filled=true]]:shadow-[0_-2px_12px_rgba(13,27,42,0.04)]
`;

const FILLED_PANE_CHROME_CLASSNAME = `
	border-slate-200
	bg-white/95
	shadow-[0_-2px_12px_rgba(13,27,42,0.04)]
`;

/**
 * Full-width bottom pane for page-specific seller actions (pagination,
 * New product, order filters, save). Solid white with a tiny alpha — no
 * frosted blur, no corner radius. Site-wide context and page-level list
 * controls (vendor picker, Filter/Stock/Sort/Show) live in the top bar.
 * Hides on scroll-down / shows on scroll-up like the top bar.
 * Publishes --seller-bottom-pane-stack so JumpToTop (non-manage) / dock
 * observers can clear the pane. While scroll-hidden, publishes 0px (not
 * removed) so IntersectionObserver rootMargins can treat the inset as gone.
 *
 * Manage keeps the bar mounted while empty (transparent clickthrough) with
 * gutter side insets so harvested controls pin into already-present chrome.
 * Other seller routes still use empty:hidden.
 *
 * Stack height uses layout metrics (offsetHeight + CSS bottom), not
 * getBoundingClientRect, so CSS hide/show transforms do not collapse the
 * offset mid-animation.
 */
export function SellerPageActionPane() {
	const pathname = usePathname();
	const { setPageBottomPaneHost } = useCatalogSearch();
	const hostRef = useRef<HTMLDivElement | null>(null);
	const lastScrollY = useRef(0);
	const [paneHidden, setPaneHidden] = useState(false);
	const sellerChrome = pathUsesSellerChrome(pathname);
	const reserveOrdersPane = pathReservesOrdersListBottomPane(pathname);
	const keepManagePane = pathKeepsManageBottomPane(pathname);

	useEffect(() => {
		if(!sellerChrome) {
			setPaneHidden(false);
			return;
		}
		lastScrollY.current = window.scrollY;
		const onScroll = () => {
			const y = Math.max(0, window.scrollY);
			const delta = y - lastScrollY.current;
			if(y <= PANE_SHOW_TOP) {
				setPaneHidden(false);
				lastScrollY.current = y;
				return;
			}
			if(delta > PANE_SCROLL_DELTA) {
				setPaneHidden(true);
				lastScrollY.current = y;
			}
			else if(delta < -PANE_SCROLL_DELTA) {
				setPaneHidden(false);
				lastScrollY.current = y;
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [sellerChrome]);

	useLayoutEffect(() => {
		if(!sellerChrome) {
			document.documentElement.style.removeProperty(STACK_VAR);
			return;
		}

		const host = hostRef.current;
		if(!host) {
			document.documentElement.style.removeProperty(STACK_VAR);
			return;
		}

		const sync = () => {
			const style = getComputedStyle(host);
			if(paneHidden || style.display === 'none') {
				// Keep the var published at 0 so dock observers reconnect to
				// inset 0 instead of a stale positive rootMargin (PEM-404).
				document.documentElement.style.setProperty(STACK_VAR, '0px');
				return;
			}
			// Transform-safe: offsetHeight ignores translateY used for hide/show.
			const height = host.offsetHeight;
			if(height < 1) {
				document.documentElement.style.setProperty(STACK_VAR, '0px');
				return;
			}
			const bottomInset = Number.parseFloat(style.bottom) || 0;
			const stack = Math.max(
				0,
				Math.ceil(height + bottomInset + STACK_GAP_PX),
			);
			document.documentElement.style.setProperty(STACK_VAR, `${stack}px`);
		};

		sync();
		const resizeObserver = new ResizeObserver(sync);
		resizeObserver.observe(host);
		const mutationObserver = new MutationObserver(sync);
		mutationObserver.observe(host, { childList: true, subtree: true });
		window.addEventListener('resize', sync);
		host.addEventListener('transitionend', sync);
		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			window.removeEventListener('resize', sync);
			host.removeEventListener('transitionend', sync);
			document.documentElement.style.removeProperty(STACK_VAR);
		};
	}, [paneHidden, reserveOrdersPane, keepManagePane, sellerChrome]);

	useEffect(() => {
		return () => {
			document.documentElement.style.removeProperty(STACK_VAR);
		};
	}, []);

	if(!sellerChrome) {
		return null;
	}

	return (
		<div
			className={
				`
					fixed
					bottom-0
					z-30
					border-t
					transition-transform
					duration-200
					ease-out
					motion-reduce:transition-none
					${keepManagePane
						? 'left-gutter right-gutter'
						: 'inset-x-0'
					}
					${reserveOrdersPane
						? `
							${FILLED_PANE_CHROME_CLASSNAME}
							pointer-events-auto
							${ORDERS_PANE_RESERVE_CLASSNAME}
						`
						: keepManagePane
							? MANAGE_HARVEST_PANE_CLASSNAME
							: `
								${FILLED_PANE_CHROME_CLASSNAME}
								pointer-events-auto
								empty:hidden
							`
					}
				`
			}
			data-hidden={paneHidden ? 'true' : 'false'}
			onFocusCapture={() => setPaneHidden(false)}
			ref={(el) => {
				hostRef.current = el;
				setPageBottomPaneHost(el);
			}}
			style={{
				transform: paneHidden
					? 'translateY(calc(100% + 1.5rem))'
					: 'translateY(0)',
				pointerEvents: paneHidden
					? 'none'
					: undefined,
			}}
		/>
	);
}
