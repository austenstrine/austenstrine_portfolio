'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { useCatalogSearch } from './CatalogSearchContext';

const STACK_VAR = '--seller-bottom-pane-stack';
const STACK_GAP_PX = 8;
const PANE_SCROLL_DELTA = 8;
const PANE_SHOW_TOP = 16;

/**
 * Compact right-aligned lightly frosted bottom pane for page-specific seller
 * actions. Docked bottom-right (bottom:0, right:0); only the top-left corner
 * is rounded. Not full-width. Site-wide context such as the vendor picker
 * stays in the top bar. Blocks click-through; frost stays faint.
 * Hides on scroll-down / shows on scroll-up like the top bar.
 * Publishes --seller-bottom-pane-stack so JumpToTop can sit above this pane.
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
				document.documentElement.style.removeProperty(STACK_VAR);
				return;
			}
			// Transform-safe: offsetHeight ignores translateY used for hide/show.
			const height = host.offsetHeight;
			if(height < 1) {
				document.documentElement.style.removeProperty(STACK_VAR);
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
	}, [paneHidden, sellerChrome]);

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
			className="
				pointer-events-auto
				fixed
				bottom-0
				right-0
				z-30
				max-w-[min(100%,52rem)]
				rounded-tl-2xl
				border
				border-b-0
				border-r-0
				border-slate-200/40
				bg-white/25
				shadow-[0_4px_24px_rgba(13,27,42,0.06)]
				backdrop-blur-[2px]
				transition-transform
				duration-200
				ease-out
				empty:hidden
				motion-reduce:transition-none
			"
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
