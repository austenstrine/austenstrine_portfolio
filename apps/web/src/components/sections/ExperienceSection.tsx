'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { PrinterIcon } from '../icons/PrinterIcon';
import {
	educationExperienceRoles,
	extracurricularExperienceRoles,
	professionalExperience,
	workExperienceRoles,
	type ExperienceKind,
	type ExperienceRole,
} from '../../data/experience';
import {
	ExperiencePrintSheet,
	printSelectedExperience,
} from './ExperiencePrintSheet';

const SOFTWARE_COUNT = professionalExperience.filter(
	(role) => role.kind === 'software',
).length;
const NON_SOFTWARE_COUNT = professionalExperience.filter(
	(role) => role.kind === 'non-software',
).length;
const ROLE_COUNT = professionalExperience.length;
const PIN_MS = 360;
/** Match CatalogHeader / SellerPageActionPane scroll chrome. */
const STICKY_SCROLL_DELTA = 8;
const STICKY_SHOW_TOP = 16;
const STICKY_MOBILE_MQ = '(max-width: 767px)';

function snapCssPixel(value: number) {
	return Math.round(value);
}

function splitRoleDates(dates: string | undefined) {
	if(!dates) {
		return {
			range: '',
			duration: null as string | null,
		};
	}

	const [range, duration] = dates.split(' · ');
	return {
		range,
		duration: duration ?? null,
	};
}

/** Kind chips are includes: empty selection → nothing in-scope. */
function matchesKindInclude(
	selected: ExperienceKind[],
	kind: ExperienceKind,
) {
	return selected.includes(kind);
}

function DateConnector({
	range,
}: {
	range: string;
}) {
	return (
		<div
			className="
				relative
				mt-1.5
			"
		>
			<div
				className="
					grid
					h-4
					grid-cols-[auto_minmax(0,1fr)_1px_calc(1.25rem+1px)]
					items-center
					md:grid-cols-[auto_minmax(0,1fr)_1px_calc(1.5rem+1px)]
				"
			>
				<p
					className="
						col-start-1
						pl-2
						pr-2
						text-sm
						leading-none
						text-slate-500
					"
				>
					{range}
				</p>
				<span
					aria-hidden="true"
					className="
						col-start-2
						col-end-4
						h-px
						bg-slate-200
					"
				/>
			</div>
			<span
				aria-hidden="true"
				className="
					absolute
					bottom-0
					right-[calc(1.25rem+1px)]
					top-2
					w-px
					bg-slate-200
					md:right-[calc(1.5rem+1px)]
				"
			/>
			<div
				aria-hidden="true"
				className="h-4"
			/>
		</div>
	);
}

/** Stem + spacer under the peek toggle; lives inside the fold so height animates. */
function DateConnectorTail() {
	return (
		<div
			aria-hidden="true"
			className="relative"
		>
			<span
				className="
					absolute
					bottom-0
					right-[calc(1.25rem+1px)]
					top-0
					w-px
					bg-slate-200
					md:right-[calc(1.5rem+1px)]
				"
			/>
			<div className="h-4" />
		</div>
	);
}

function PeekToggle({
	expanded,
	onClick,
	range,
	title,
}: {
	expanded: boolean;
	onClick: () => void;
	range: string;
	title: string;
}) {
	return (
		<button
			aria-expanded={expanded}
			aria-label={
				expanded
					? `Hide ${title}`
					: `Peek ${title}`
			}
			className={
				expanded
					? `
						mt-1.5
						grid
						h-4
						w-full
						grid-cols-[auto_minmax(0,1fr)_1px_calc(1.25rem+1px)]
						items-center
						text-left
						text-sm
						leading-none
						text-slate-500
						hover:text-slate-600
						md:grid-cols-[auto_minmax(0,1fr)_1px_calc(1.5rem+1px)]
					`
					: `
						mt-1.5
						flex
						h-4
						w-full
						items-center
						justify-start
						gap-1.5
						text-left
						text-sm
						leading-none
						text-slate-400
						hover:text-slate-600
					`
			}
			onClick={onClick}
			type="button"
		>
			{expanded
				? (
					<>
						<span
							className="
								col-start-1
								pl-2
								pr-2
							"
						>
							{range}
						</span>
						<span
							aria-hidden="true"
							className="
								col-start-2
								col-end-4
								h-px
								bg-slate-200
							"
						/>
					</>
				)
				: (
					<>
						<span className="font-medium">
							{title}
						</span>
						<span aria-hidden="true">
							·
						</span>
						<span>
							{range}
						</span>
					</>
				)}
		</button>
	);
}

function ExperienceRoleCard({
	className = '',
	role,
}: {
	className?: string;
	role: ExperienceRole;
}) {
	const { duration } = splitRoleDates(role.dates);

	return (
		<article
			className={`
				rounded-2xl
				border
				border-slate-100
				bg-frost/60
				p-inset
				md:p-6
				${className}
			`}
		>
			<div
				className="
					flex
					items-baseline
					justify-between
					gap-4
					md:gap-6
				"
			>
				<h3
					className="
						min-w-0
						text-lg
						font-semibold
						text-ink
					"
				>
					{role.title}
				</h3>
				{duration
					? (
						<p
							className="
								shrink-0
								text-sm
								text-slate-500
							"
						>
							{duration}
						</p>
					)
					: null}
			</div>
			<p
				className="
					mt-1
					text-sm
					font-semibold
					text-sky
				"
			>
				{role.organization}
			</p>
			{role.location
				? (
					<p
						className="
							text-xs
							font-medium
							uppercase
							tracking-wide
							text-slate-500
						"
					>
						{role.location}
					</p>
				)
				: null}
			{role.bullets.length > 0
				? (
					<ul
						className="
							mt-4
							list-disc
							space-y-2
							pl-5
							text-sm
							leading-relaxed
							text-slate-700
							max-[399px]:pl-4
						"
					>
						{role.bullets.map((bullet) => (
							<li key={bullet}>
								{bullet}
							</li>
						))}
					</ul>
				)
				: null}
		</article>
	);
}

function FacetCheck({
	checked,
	count,
	label,
	onChange,
}: {
	checked: boolean;
	count: number;
	label: string;
	onChange: () => void;
}) {
	return (
		<label
			className="
				flex
				min-h-11
				cursor-pointer
				items-center
				gap-2
				text-[13px]
				text-ink
			"
		>
			<input
				checked={checked}
				className="
					h-5
					w-5
					shrink-0
					rounded
					border-slate-300
					accent-ink
					md:h-4
					md:w-4
				"
				onChange={onChange}
				type="checkbox"
			/>
			<span>
				{label}
			</span>
			<span
				className="
					text-[11px]
					tabular-nums
					text-slate-400
				"
			>
				{count}
			</span>
		</label>
	);
}

function SaveSelectedPdfButton({
	disabled,
	onClick,
}: {
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			aria-disabled={disabled}
			aria-label="Save selected experience as PDF"
			className={
				disabled
					? `
						inline-flex
						h-11
						w-11
						shrink-0
						cursor-not-allowed
						items-center
						justify-center
						rounded-full
						border
						border-slate-200
						text-slate-300
						md:h-9
						md:w-auto
						md:gap-1.5
						md:px-3
					`
					: `
						inline-flex
						h-11
						w-11
						shrink-0
						items-center
						justify-center
						rounded-full
						border
						border-slate-200
						text-ink
						transition
						hover:border-slate-300
						hover:bg-frost
						md:h-9
						md:w-auto
						md:gap-1.5
						md:px-3
					`
			}
			disabled={disabled}
			onClick={onClick}
			title={
				disabled
					? undefined
					: 'Save selected experience as PDF'
			}
			type="button"
		>
			<PrinterIcon
				className="h-3.5 w-3.5"
			/>
			<span
				className="
					hidden
					text-[13px]
					font-semibold
					md:inline
				"
			>
				PDF
			</span>
		</button>
	);
}

export function ExperienceSection() {
	const [selectedKinds, setSelectedKinds] = useState<ExperienceKind[]>([]);
	const [peekedIds, setPeekedIds] = useState<string[]>([]);
	const [filtersOpen, setFiltersOpen] = useState(true);
	const sectionRef = useRef<HTMLElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const slotRef = useRef<HTMLDivElement>(null);
	const stickyRef = useRef<HTMLDivElement>(null);
	const timelinesRef = useRef<HTMLDivElement>(null);
	const pinRef = useRef<{ id: string; offset: number } | null>(null);
	const pinUntilRef = useRef(0);

	useLayoutEffect(() => {
		const sectionNode = sectionRef.current;
		const sentinelNode = sentinelRef.current;
		const slotNode = slotRef.current;
		const barNode = stickyRef.current;
		if(!sectionNode || !sentinelNode || !slotNode || !barNode) {
			return;
		}

		const sectionEl: HTMLElement = sectionNode;
		const sentinelEl: HTMLDivElement = sentinelNode;
		const slotEl: HTMLDivElement = slotNode;
		const barEl: HTMLDivElement = barNode;
		const mobileMq = window.matchMedia(STICKY_MOBILE_MQ);

		let frame = 0;
		let stuck = false;
		let barHidden = false;
		let lastScrollY = window.scrollY;
		const box = {
			left: 0,
			width: 0,
		};

		function write(
			el: HTMLElement,
			key: 'height' | 'left' | 'position' | 'top' | 'transform' | 'width',
			value: string,
		) {
			if(el.style[key] !== value) {
				el.style[key] = value;
			}
		}

		function canAutoHide() {
			return !filtersOpen && mobileMq.matches;
		}

		function measureBox() {
			const sectionRect = sectionEl.getBoundingClientRect();
			const styles = getComputedStyle(sectionEl);
			const borderLeft = Number.parseFloat(styles.borderLeftWidth);
			const borderRight = Number.parseFloat(styles.borderRightWidth);
			box.left = snapCssPixel(sectionRect.left + borderLeft);
			box.width = snapCssPixel(
				sectionRect.width - borderLeft - borderRight,
			);
		}

		function release() {
			write(slotEl, 'height', '');
			barEl.removeAttribute('data-stuck');
			barEl.removeAttribute('data-hidden');
			write(barEl, 'position', '');
			write(barEl, 'top', '');
			write(barEl, 'left', '');
			write(barEl, 'width', '');
			write(barEl, 'transform', '');
			if(barEl.style.pointerEvents) {
				barEl.style.pointerEvents = '';
			}
		}

		function dock() {
			const sentinelRect = sentinelEl.getBoundingClientRect();
			const sectionRect = sectionEl.getBoundingClientRect();
			const y = Math.max(0, window.scrollY);
			const delta = y - lastScrollY;

			if(sentinelRect.bottom <= 0) {
				stuck = true;
			}
			else if(sentinelRect.top >= 0) {
				stuck = false;
			}

			if(!stuck) {
				barHidden = false;
				lastScrollY = y;
				release();
				return;
			}

			if(canAutoHide()) {
				// Sentinel just crossed → keep bar visible near stick start.
				if(sentinelRect.bottom > -STICKY_SHOW_TOP) {
					barHidden = false;
					lastScrollY = y;
				}
				else if(delta > STICKY_SCROLL_DELTA) {
					barHidden = true;
					lastScrollY = y;
				}
				else if(delta < -STICKY_SCROLL_DELTA) {
					barHidden = false;
					lastScrollY = y;
				}
			}
			else {
				barHidden = false;
				lastScrollY = y;
			}

			if(barEl.style.position !== 'fixed') {
				measureBox();
			}

			// Reserve the in-flow bar height on the slot BEFORE taking the
			// bar out of flow. Reading offsetHeight after position:fixed
			// forces a reflow with a collapsed slot; scroll anchoring then
			// eats homepage hash scroll-margin (#featured-build lands on
			// the title instead of the frost gutter above the card).
			// Keep spacer at full bar height while hidden — collapsing it
			// to 0 also fights auto-hide via the same anchor loop.
			barEl.setAttribute('data-stuck', '');
			barEl.setAttribute(
				'data-hidden',
				barHidden
					? 'true'
					: 'false',
			);
			if(barEl.style.position !== 'fixed') {
				write(slotEl, 'height', `${barEl.offsetHeight}px`);
			}
			write(barEl, 'position', 'fixed');
			write(barEl, 'left', `${box.left}px`);
			write(barEl, 'width', `${box.width}px`);
			const height = barEl.offsetHeight;
			write(slotEl, 'height', `${height}px`);
			write(barEl, 'top', `${
				snapCssPixel(Math.min(0, sectionRect.bottom - height))
			}px`);
			write(
				barEl,
				'transform',
				barHidden
					? 'translateY(-100%)'
					: 'translateY(0)',
			);
			barEl.style.pointerEvents = barHidden
				? 'none'
				: '';
		}

		function onFrame() {
			frame = 0;
			dock();
		}

		function requestDock() {
			if(frame !== 0) {
				return;
			}

			frame = window.requestAnimationFrame(onFrame);
		}

		function onResize() {
			measureBox();
			requestDock();
		}

		function onFocusCapture() {
			if(!barHidden) {
				return;
			}

			barHidden = false;
			requestDock();
		}

		measureBox();
		dock();
		window.addEventListener('scroll', requestDock, { passive: true });
		window.addEventListener('resize', onResize);
		mobileMq.addEventListener('change', onResize);
		barEl.addEventListener('focusin', onFocusCapture);
		const observer = new ResizeObserver(onResize);
		observer.observe(sectionEl);
		observer.observe(barEl);

		return () => {
			if(frame !== 0) {
				window.cancelAnimationFrame(frame);
			}

			window.removeEventListener('scroll', requestDock);
			window.removeEventListener('resize', onResize);
			mobileMq.removeEventListener('change', onResize);
			barEl.removeEventListener('focusin', onFocusCapture);
			observer.disconnect();
			release();
		};
	}, [filtersOpen]);

	function pinFromSticky(preferredId?: string) {
		const sticky = stickyRef.current;
		const timelines = timelinesRef.current;
		if(!sticky || !timelines) {
			return;
		}

		const stickyBottom = sticky.getBoundingClientRect().bottom;
		let item: HTMLElement | null = preferredId
			? timelines.querySelector(`[data-role-mark="${preferredId}"]`)
			: null;

		if(!item) {
			const rows = timelines.querySelectorAll<HTMLElement>('[data-role-id]');
			for(const row of rows) {
				if(row.getBoundingClientRect().bottom > stickyBottom + 8) {
					item = row.querySelector('[data-role-mark]') ?? row;
					break;
				}
			}
		}

		const id = item?.dataset.roleMark ?? item?.dataset.roleId;
		if(!item || !id) {
			return;
		}

		pinRef.current = {
			id,
			offset: item.getBoundingClientRect().top - stickyBottom,
		};
		pinUntilRef.current = performance.now() + PIN_MS;
	}

	function applyPin() {
		const pin = pinRef.current;
		const sticky = stickyRef.current;
		const timelines = timelinesRef.current;
		if(!pin || !sticky || !timelines || performance.now() > pinUntilRef.current) {
			return;
		}

		const item = timelines.querySelector<HTMLElement>(
			`[data-role-mark="${pin.id}"]`,
		) ?? timelines.querySelector<HTMLElement>(
			`[data-role-id="${pin.id}"]`,
		);
		if(!item) {
			return;
		}

		const delta = item.getBoundingClientRect().top
			- sticky.getBoundingClientRect().bottom
			- pin.offset;
		if(Math.abs(delta) > 0.5) {
			window.scrollBy(0, delta);
		}
	}

	useLayoutEffect(() => {
		if(!pinRef.current) {
			return;
		}

		applyPin();
		const timelines = timelinesRef.current;
		if(!timelines) {
			return;
		}

		const observer = new ResizeObserver(() => applyPin());
		observer.observe(timelines);
		const timer = window.setTimeout(() => {
			observer.disconnect();
			pinRef.current = null;
		}, PIN_MS);

		return () => {
			observer.disconnect();
			window.clearTimeout(timer);
		};
	}, [selectedKinds, peekedIds]);

	function inScope(role: ExperienceRole) {
		return matchesKindInclude(selectedKinds, role.kind);
	}

	function toggleKind(kind: ExperienceKind) {
		pinFromSticky();
		setSelectedKinds((current) => (
			current.includes(kind)
				? current.filter((row) => row !== kind)
				: [...current, kind]
		));
	}

	function peekRole(id: string) {
		pinFromSticky(id);
		setPeekedIds((current) => (
			current.includes(id) ? current : [...current, id]
		));
	}

	function hidePeek(id: string) {
		pinFromSticky(id);
		setPeekedIds((current) => current.filter((row) => row !== id));
	}

	function togglePeek(id: string) {
		if(peekedIds.includes(id)) {
			hidePeek(id);
			return;
		}

		peekRole(id);
	}

	/**
	 * Three category timelines; shared kind includes ANDs with each
	 * (in-scope = selected kind; else peekable — same UX as before).
	 */
	const timelineBlocks: {
		id: string;
		title: string;
		roles: ExperienceRole[];
	}[] = [
		{
			id: 'work-experience',
			title: 'Work experience',
			roles: workExperienceRoles,
		},
		{
			id: 'education',
			title: 'Education',
			roles: educationExperienceRoles,
		},
		{
			id: 'extracurricular',
			title: 'Extra-Curricular',
			roles: extracurricularExperienceRoles,
		},
	];

	const expandedRoles = timelineBlocks.flatMap((block) => (
		block.roles.filter((role) => (
			inScope(role) || peekedIds.includes(role.id)
		))
	));
	const selectedForPrintCount = expandedRoles.length;
	const canPrintSelected = selectedForPrintCount > 0;

	return (
		<section
			className="
				rounded-none
				border
				border-slate-200
				bg-white
				px-gutter
				py-8
				shadow-sm
				sm:rounded-2xl
			"
			id="experience"
			ref={sectionRef}
		>
			<ExperiencePrintSheet roles={expandedRoles} />

			<div
				className="
					max-w-3xl
				"
			>
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.18em]
						text-sky
					"
				>
					Background
				</p>
				<h2
					className="
						mt-2
						text-3xl
						font-semibold
						text-ink
					"
				>
					Experience
				</h2>
			</div>

			<div
				aria-hidden="true"
				className="h-4"
				ref={sentinelRef}
			/>
			<div
				className="
					-mx-gutter
					[overflow-anchor:none]
				"
				ref={slotRef}
			>
			<div
				className="
					z-20
					bg-white
					px-gutter
					py-2
					[overflow-anchor:none]
					transition-transform
					duration-200
					ease-out
					motion-reduce:transition-none
					after:pointer-events-none
					after:absolute
					after:inset-x-0
					after:bottom-0
					after:h-px
					after:bg-slate-200
					after:content-['']
					after:opacity-0
					data-[stuck]:after:opacity-100
					data-[stuck]:shadow-[0_-1rem_0_0_#fff]
				"
				ref={stickyRef}
			>
				<div
					className="
						flex
						h-11
						flex-nowrap
						items-center
						justify-between
						gap-3
						md:hidden
					"
				>
					{filtersOpen
						? (
							<div
								className="
									flex
									min-w-0
									items-center
									gap-x-4
								"
							>
								<FacetCheck
									checked={selectedKinds.includes('software')}
									count={SOFTWARE_COUNT}
									label="Software"
									onChange={() => toggleKind('software')}
								/>
								<FacetCheck
									checked={selectedKinds.includes('non-software')}
									count={NON_SOFTWARE_COUNT}
									label="Non-software"
									onChange={() => toggleKind('non-software')}
								/>
							</div>
						)
						: (
							<p
								aria-live="polite"
								className="
									truncate
									text-sm
									text-slate-600
								"
							>
								{`${selectedForPrintCount} of ${ROLE_COUNT} selected for print`}
							</p>
						)}
					<div
						className="
							flex
							shrink-0
							items-center
							gap-2
						"
					>
						<SaveSelectedPdfButton
							disabled={!canPrintSelected}
							onClick={printSelectedExperience}
						/>
						<button
							className="
								shrink-0
								text-sm
								font-semibold
								text-ink
							"
							onClick={() => setFiltersOpen((open) => !open)}
							type="button"
						>
							{filtersOpen
								? 'Hide'
								: 'View'}
						</button>
					</div>
				</div>
				<div
					className="
						hidden
						items-center
						justify-between
						gap-x-4
						md:flex
					"
				>
					<div
						className="
							flex
							items-center
							gap-x-5
						"
					>
						<FacetCheck
							checked={selectedKinds.includes('software')}
							count={SOFTWARE_COUNT}
							label="Software"
							onChange={() => toggleKind('software')}
						/>
						<FacetCheck
							checked={selectedKinds.includes('non-software')}
							count={NON_SOFTWARE_COUNT}
							label="Non-software"
							onChange={() => toggleKind('non-software')}
						/>
					</div>
					<div
						className="
							flex
							items-center
							gap-3
						"
					>
						<p
							aria-live="polite"
							className="
								text-sm
								text-slate-600
							"
						>
							{`${selectedForPrintCount} of ${ROLE_COUNT} selected for print`}
						</p>
						<SaveSelectedPdfButton
							disabled={!canPrintSelected}
							onClick={printSelectedExperience}
						/>
					</div>
				</div>
			</div>
			</div>

			<div
				className="mt-8 space-y-10"
				ref={timelinesRef}
			>
				{timelineBlocks.map((block) => (
					<section
						aria-labelledby={`timeline-${block.id}-heading`}
						key={block.id}
					>
						<h3
							className="
								text-xl
								font-semibold
								text-ink
							"
							id={`timeline-${block.id}-heading`}
						>
							{block.title}
						</h3>
						<ExperienceTimelineList
							hidePeek={hidePeek}
							inScope={inScope}
							peekRole={peekRole}
							peekedIds={peekedIds}
							roles={block.roles}
							togglePeek={togglePeek}
						/>
					</section>
				))}
			</div>
		</section>
	);
}

function ExperienceTimelineList({
	hidePeek,
	inScope,
	peekRole,
	peekedIds,
	roles,
	togglePeek,
}: {
	hidePeek: (id: string) => void;
	inScope: (role: ExperienceRole) => boolean;
	peekRole: (id: string) => void;
	peekedIds: string[];
	roles: ExperienceRole[];
	togglePeek: (id: string) => void;
}) {
	return (
		<ol
			className="
				timeline-list
				relative
				mt-4
			"
		>
			<div
				aria-hidden="true"
				className="
					absolute
					bottom-3
					left-[7px]
					top-3
					w-px
					bg-slate-200
				"
			/>
			{roles.map((role) => {
				const scoped = inScope(role);
				const peeked = peekedIds.includes(role.id);
				const expanded = scoped || peeked;
				const dateRange = splitRoleDates(role.dates).range;
				const markClass = `
					flex
					h-4
					w-4
					items-center
					justify-center
					rounded-full
					border-2
					ring-4
					ring-white
					transition-[background-color,border-color]
					duration-300
					${scoped && expanded
						? 'border-sky bg-sky'
						: peeked && expanded
							? 'border-slate-400 bg-white'
							: 'border-slate-300 bg-white'}
				`;

				return (
					<li
						className={
							expanded
								? `
									relative
									flex
									items-start
									gap-4
									pb-6
									transition-[padding]
									duration-300
									last:pb-0
								`
								: `
									relative
									flex
									items-start
									gap-4
									pb-3
									transition-[padding]
									duration-300
									last:pb-0
								`
						}
						data-role-id={role.id}
						key={role.id}
					>
						{expanded
							? (
								<span
									aria-hidden="true"
									className="
										pointer-events-none
										absolute
										left-4
										top-[0.875rem]
										z-[1]
										h-px
										w-4
										bg-slate-200
									"
								/>
							)
							: null}
						<div
							className="
								relative
								z-10
								mt-1.5
								h-4
								w-4
								shrink-0
							"
						>
							{scoped
								? (
									<span
										aria-hidden="true"
										className={markClass}
										data-role-mark={role.id}
									/>
								)
								: (
									<button
										aria-label={
											expanded
												? `Hide ${role.title}`
												: `Peek ${role.title}`
										}
										className="
											absolute
											left-1/2
											top-1/2
											flex
											h-11
											w-11
											-translate-x-1/2
											-translate-y-1/2
											items-center
											justify-center
											md:h-4
											md:w-4
										"
										data-role-mark={role.id}
										onClick={() => (
											expanded
												? hidePeek(role.id)
												: peekRole(role.id)
										)}
										type="button"
									>
										<span
											aria-hidden="true"
											className={markClass}
										>
											<span
												aria-hidden="true"
												className={
													expanded
														? `
															block
															h-0.5
															w-2
															rounded-full
															bg-slate-400
															opacity-100
															transition-opacity
															duration-300
														`
														: `
															block
															h-0.5
															w-2
															rounded-full
															bg-slate-400
															opacity-0
															transition-opacity
															duration-300
														`
												}
											/>
										</span>
									</button>
								)}
						</div>
						<div className="min-w-0 flex-1">
							{!scoped
								? (
									<PeekToggle
										expanded={expanded}
										onClick={() => togglePeek(role.id)}
										range={dateRange || role.organization}
										title={role.title}
									/>
								)
								: null}
							<div
								aria-hidden={!expanded}
								className={
									expanded
										? 'timeline-fold timeline-fold-open'
										: 'timeline-fold'
								}
							>
								<div className="timeline-fold-inner">
									{scoped && dateRange
										? (
											<DateConnector
												range={dateRange}
											/>
										)
										: (
											<DateConnectorTail />
										)}
									<ExperienceRoleCard role={role} />
								</div>
							</div>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
