'use client';

import { useEffect, useState } from 'react';

type Rect = {
	top: number;
	left: number;
	width: number;
	height: number;
};

type TutorialSpotlightProps = {
	/** Matches `data-tutorial="..."` on the element to highlight. */
	target: string | null;
	padding?: number;
};

function readRect(target: string, padding: number): Rect | null {
	const element = document.querySelector<HTMLElement>(`[data-tutorial="${target}"]`);
	if(!element) {
		return null;
	}

	const box = element.getBoundingClientRect();
	return {
		top: Math.max(0, box.top - padding),
		left: Math.max(0, box.left - padding),
		width: box.width + padding * 2,
		height: box.height + padding * 2,
	};
}

export function TutorialSpotlight({ target, padding = 10 }: TutorialSpotlightProps) {
	const [rect, setRect] = useState<Rect | null>(null);

	useEffect(() => {
		if(!target) {
			setRect(null);
			return;
		}

		const sync = () => {
			const next = readRect(target, padding);
			setRect(next);
			const element = document.querySelector<HTMLElement>(`[data-tutorial="${target}"]`);
			if(element) {
				element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			}
		};

		sync();
		const frame = window.requestAnimationFrame(sync);
		window.addEventListener('resize', sync);
		window.addEventListener('scroll', sync, true);

		const observer = new MutationObserver(sync);
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
		});

		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener('resize', sync);
			window.removeEventListener('scroll', sync, true);
			observer.disconnect();
		};
	}, [target, padding]);

	if(!target || !rect) {
		return null;
	}

	const bottom = rect.top + rect.height;
	const right = rect.left + rect.width;

	return (
		<div
			className="
				pointer-events-none
				fixed
				inset-0
				z-30
			"
			aria-hidden
		>
			<div
				className="
					pointer-events-auto
					absolute
					bg-slate-950/45
				"
				style={{ top: 0, left: 0, right: 0, height: rect.top }}
			/>
			<div
				className="
					pointer-events-auto
					absolute
					bg-slate-950/45
				"
				style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
			/>
			<div
				className="
					pointer-events-auto
					absolute
					bg-slate-950/45
				"
				style={{
					top: rect.top,
					left: 0,
					width: rect.left,
					height: rect.height,
				}}
			/>
			<div
				className="
					pointer-events-auto
					absolute
					bg-slate-950/45
				"
				style={{
					top: rect.top,
					left: right,
					right: 0,
					height: rect.height,
				}}
			/>
			<div
				className="
					pointer-events-none
					absolute
					rounded-xl
					ring-2
					ring-sky
					ring-offset-2
					ring-offset-transparent
					shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_24px_rgba(56,189,248,0.35)]
				"
				style={{
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
				}}
			/>
		</div>
	);
}
