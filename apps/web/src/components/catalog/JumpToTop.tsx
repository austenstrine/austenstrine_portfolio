'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';

const SHOW_AFTER_PX = 320;

/** Outside max-w-7xl: content side margin + page gutter (right edge → content). */
const SIDE_RAIL =
	'calc(max(0px, (100vw - 80rem) / 2) + var(--gutter))';

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Right side: centered in the combined page gutter + max-w-7xl content
 * margin (not a gutter-only / min-3rem rail that eats into content). When
 * that strip is narrower than the control, the rail hangs off-viewport so
 * New product stays clear. Bottom: stays over the seller context bar and
 * aligns near mid-bar via --seller-bottom-pane-stack; still clears the
 * product sticky CTA stack.
 */
export function JumpToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const sync = () => {
			setVisible(window.scrollY > SHOW_AFTER_PX);
		};
		sync();
		window.addEventListener('scroll', sync, { passive: true });
		return () => window.removeEventListener('scroll', sync);
	}, []);

	if(!visible) {
		return null;
	}

	return (
		<div
			className="
				pointer-events-none
				fixed
				bottom-[calc(max(max(12px,var(--gutter)-12px),calc(var(--seller-bottom-pane-stack,0px)/2-1.5rem))+var(--product-sticky-cta-stack,0px))]
				right-0
				z-40
				flex
				w-[max(3rem,var(--jump-side-rail))]
				justify-center
				transition-[bottom]
				duration-200
				ease-out
				motion-reduce:transition-none
				mr-[min(0px,calc(var(--jump-side-rail)-3rem))]
			"
			style={
				{
					['--jump-side-rail']: SIDE_RAIL,
				} as CSSProperties
			}
		>
			<button
				aria-label="Back to top"
				className="
					pointer-events-auto
					inline-flex
					h-12
					w-12
					shrink-0
					items-center
					justify-center
					rounded-full
					bg-asgreen
					text-white
					shadow-[0_8px_22px_rgba(13,27,42,0.38),0_2px_8px_rgba(37,114,87,0.45)]
					hover:bg-asgreen/90
					focus-visible:outline
					focus-visible:outline-2
					focus-visible:outline-offset-2
					focus-visible:outline-white
				"
				onClick={() => {
					window.scrollTo({
						top: 0,
						behavior: prefersReducedMotion()
							? 'auto'
							: 'smooth',
					});
				}}
				type="button"
			>
				<ArrowUpIcon className="h-5 w-5" />
			</button>
		</div>
	);
}
