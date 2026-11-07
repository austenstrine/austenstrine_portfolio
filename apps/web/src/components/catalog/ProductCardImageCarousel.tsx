'use client';

import {
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	type UIEvent,
} from 'react';
import { CatalogCover } from './CatalogCover';

type ProductCardImageCarouselProps = {
	/** Omit when the image plane should not navigate (seller in-place edit). */
	href?: string;
	images: string[];
	alt: string;
	fallback: ReactNode;
	/** Disable snap links; parent owns click targets. */
	editable?: boolean;
};

export function ProductCardImageCarousel({
	href,
	images,
	alt,
	fallback,
	editable = false,
}: ProductCardImageCarouselProps) {
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(0);
	const urls = images.filter(Boolean);
	const multi = urls.length > 1;

	const goTo = (index: number) => {
		const el = scrollerRef.current;
		if(!el) {
			return;
		}
		const next = Math.min(Math.max(index, 0), urls.length - 1);
		el.scrollTo({
			left: next * el.clientWidth,
			behavior: 'smooth',
		});
	};

	const onScroll = (event: UIEvent<HTMLDivElement>) => {
		const el = event.currentTarget;
		if(el.clientWidth <= 0) {
			return;
		}
		const next = Math.round(el.scrollLeft / el.clientWidth);
		setActive(Math.min(Math.max(next, 0), Math.max(urls.length - 1, 0)));
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if(!multi) {
			return;
		}
		if(event.key === 'ArrowRight') {
			event.preventDefault();
			goTo(active + 1);
		}
		else if(event.key === 'ArrowLeft') {
			event.preventDefault();
			goTo(active - 1);
		}
	};

	const onDotClick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
		event.preventDefault();
		event.stopPropagation();
		goTo(index);
	};

	if(urls.length === 0) {
		return (
			<div className="absolute inset-0">
				{fallback}
			</div>
		);
	}

	return (
		<div className="absolute inset-0">
			<div
				className="
					flex
					h-full
					w-full
					snap-x
					snap-mandatory
					overflow-x-auto
					overflow-y-hidden
					overscroll-x-contain
					scrollbar-none
				"
				onKeyDown={onKeyDown}
				onScroll={onScroll}
				ref={scrollerRef}
			>
				{urls.map((src, index) => {
					const slideClassName = `
						relative
						h-full
						min-w-full
						shrink-0
						snap-start
					`;
					const cover = (
						<CatalogCover
							className="
								h-full
								w-full
								object-cover
							"
							src={src}
							alt=""
							width={800}
							height={800}
							fallback={
								(
									index === 0
										? fallback
										: (
											<div
												className="
													h-full
													w-full
													bg-canvas
												"
											/>
										)
								)
							}
						/>
					);
					if(editable || !href) {
						return (
							<div
								key={`${src}-${index}`}
								aria-label={index === 0 ? alt : undefined}
								className={slideClassName}
								tabIndex={index === 0 ? 0 : -1}
							>
								{cover}
							</div>
						);
					}
					return (
						<a
							key={`${src}-${index}`}
							className={slideClassName}
							aria-label={index === 0 ? alt : undefined}
							draggable={false}
							href={href}
							tabIndex={index === 0 ? 0 : -1}
						>
							{cover}
						</a>
					);
				})}
			</div>
			{multi
				? (
					<>
						<div
							aria-hidden="true"
							className="
								pointer-events-none
								absolute
								inset-x-0
								bottom-0
								h-16
								bg-gradient-to-t
								from-sky/50
								to-transparent
							"
						/>
						<div
							aria-hidden="true"
							className="
								absolute
								inset-x-0
								bottom-2
								z-10
								flex
								justify-center
							"
						>
							<div
								className="
									flex
									items-center
									rounded-full
									bg-sky/30
									px-1
									py-0.5
								"
							>
								{urls.map((_, index) => (
									<button
										key={index}
										className="
											flex
											h-5
											w-5
											items-center
											justify-center
										"
										onClick={
											(event) => onDotClick(event, index)
										}
										tabIndex={-1}
										type="button"
									>
										<span
											className={
												index === active
													? `
														h-1.5
														w-1.5
														rounded-full
														bg-sky
														shadow-[0_0_0_1px_rgba(255,255,255,0.7)]
													`
													: `
														h-1.5
														w-1.5
														rounded-full
														bg-frost
														shadow-[0_0_0_1px_rgba(255,255,255,0.45)]
													`
											}
										/>
									</button>
								))}
							</div>
						</div>
					</>
				)
				: null}
		</div>
	);
}
