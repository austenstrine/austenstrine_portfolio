'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import {
	glossaryHref,
	getGlossaryTerm,
	type GlossaryTermId,
} from '../../lib/glossary';

type TermHintProps = {
	termId: GlossaryTermId;
};

export function TermHint({ termId }: TermHintProps) {
	const term = getGlossaryTerm(termId);
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLSpanElement>(null);
	const tooltipId = useId();
	const href = glossaryHref(termId);

	useEffect(() => {
		if(!open) {
			return;
		}

		const onPointerDown = (event: PointerEvent) => {
			if(rootRef.current?.contains(event.target as Node)) {
				return;
			}

			setOpen(false);
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if(event.key === 'Escape') {
				setOpen(false);
			}
		};

		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	return (
		<span
			className="relative inline-flex align-middle"
			ref={rootRef}
		>
			<button
				className="
					inline-flex
					h-4
					w-4
					shrink-0
					items-center
					justify-center
					rounded-full
					border
					border-slate-300
					text-[10px]
					font-semibold
					leading-none
					text-slate-500
					hover:border-sky
					hover:text-sky
					focus:outline-none
					focus:ring-2
					focus:ring-sky/40
				"
				type="button"
				aria-expanded={open}
				aria-controls={tooltipId}
				aria-label={`What is ${term.term}?`}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setOpen((current) => !current);
				}}
			>
				?
			</button>
			{open
				? (
					<div
						className="
							absolute
							left-0
							top-full
							z-30
							mt-1.5
							w-64
							rounded-xl
							border
							border-slate-200
							bg-white
							p-3
							text-left
							shadow-lg
						"
						id={tooltipId}
						role="dialog"
						aria-label={term.term}
						onPointerDown={(event) => {
							event.stopPropagation();
						}}
						onClick={(event) => {
							event.stopPropagation();
						}}
					>
						<p className="text-sm font-semibold text-ink">
							{term.term}
						</p>
						<p
							className="
								mt-1
								text-sm
								text-slate-600
							"
						>
							{term.short}
						</p>
						<Link
							className="
								mt-2
								inline-block
								text-sm
								font-semibold
								text-sky
								hover:underline
							"
							href={href}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								router.push(href);
							}}
						>
							Learn more
						</Link>
					</div>
				)
				: null
			}
		</span>
	);
}
