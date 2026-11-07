'use client';

import { useEffect, useState } from 'react';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';

const SHOW_AFTER_PX = 320;

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
		<button
			aria-label="Back to top"
			className="
				fixed
				bottom-[calc(max(12px,var(--gutter)-12px)+var(--seller-bottom-pane-stack,0px)+var(--product-sticky-cta-stack,0px))]
				right-[max(12px,calc(var(--gutter)-12px))]
				z-40
				inline-flex
				h-12
				w-12
				items-center
				justify-center
				rounded-full
				bg-asgreen
				text-white
				shadow-[0_8px_22px_rgba(13,27,42,0.38),0_2px_8px_rgba(37,114,87,0.45)]
				transition-[bottom]
				duration-200
				ease-out
				hover:bg-asgreen/90
				focus-visible:outline
				focus-visible:outline-2
				focus-visible:outline-offset-2
				focus-visible:outline-white
				motion-reduce:transition-none
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
	);
}
