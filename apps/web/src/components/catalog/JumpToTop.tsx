'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pathKeepsManageBottomPane } from '../../lib/accessGate';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';

const SHOW_AFTER_PX = 320;

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Sitewide: bottom of the right gutter, centered in a rail at least as wide as
 * the control (so it never clips off-screen), lifting live above seller /
 * sticky-CTA stacks. Manage (guttered bottom pane): stationary bottom-right in
 * the right gutter, overlapping the pane whether scroll-hidden or not.
 */
export function JumpToTop() {
	const pathname = usePathname();
	const manageCorner = pathKeepsManageBottomPane(pathname);
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
			className={
				manageCorner
					? `
						pointer-events-none
						fixed
						bottom-[max(12px,calc(var(--gutter)-12px))]
						right-0
						z-40
						flex
						w-[max(var(--gutter),3rem)]
						justify-center
					`
					: `
						pointer-events-none
						fixed
						bottom-[calc(max(12px,var(--gutter)-12px)+var(--seller-bottom-pane-stack,0px)+var(--product-sticky-cta-stack,0px))]
						right-0
						z-40
						flex
						w-[max(var(--gutter),3rem)]
						justify-center
						transition-[bottom]
						duration-200
						ease-out
						motion-reduce:transition-none
					`
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
