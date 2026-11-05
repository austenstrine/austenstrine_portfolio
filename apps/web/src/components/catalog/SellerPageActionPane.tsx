'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { useCatalogSearch } from './CatalogSearchContext';

const STACK_VAR = '--seller-bottom-pane-stack';
const STACK_GAP_PX = 8;

/**
 * Right-aligned lightly frosted bottom pane for page-specific seller actions.
 * Blocks click-through; frost stays light enough to read text beneath.
 * Publishes --seller-bottom-pane-stack so JumpToTop can sit above this pane.
 */
export function SellerPageActionPane() {
	const pathname = usePathname();
	const { setPageBottomPaneHost } = useCatalogSearch();
	const hostRef = useRef<HTMLDivElement | null>(null);
	const sellerChrome = pathUsesSellerChrome(pathname);

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
			if(style.display === 'none') {
				document.documentElement.style.removeProperty(STACK_VAR);
				return;
			}
			const rect = host.getBoundingClientRect();
			if(rect.height < 1) {
				document.documentElement.style.removeProperty(STACK_VAR);
				return;
			}
			const bottomInset = window.innerHeight - rect.bottom;
			const stack = Math.ceil(rect.height + bottomInset + STACK_GAP_PX);
			document.documentElement.style.setProperty(STACK_VAR, `${stack}px`);
		};

		sync();
		const resizeObserver = new ResizeObserver(sync);
		resizeObserver.observe(host);
		const mutationObserver = new MutationObserver(sync);
		mutationObserver.observe(host, { childList: true, subtree: true });
		window.addEventListener('resize', sync);
		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			window.removeEventListener('resize', sync);
			document.documentElement.style.removeProperty(STACK_VAR);
		};
	}, [sellerChrome]);

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
				bottom-[max(0.75rem,env(safe-area-inset-bottom))]
				right-[max(12px,calc(var(--gutter)-12px))]
				z-30
				max-w-[min(calc(100%-24px),28rem)]
				rounded-2xl
				border
				border-slate-200/50
				bg-white/40
				shadow-[0_4px_24px_rgba(13,27,42,0.08)]
				backdrop-blur-[6px]
				empty:hidden
			"
			ref={(el) => {
				hostRef.current = el;
				setPageBottomPaneHost(el);
			}}
		/>
	);
}
