'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
	education,
	professionalExperience,
	type ExperienceKind,
	type ExperienceRole,
} from '../../data/experience';

const SOFTWARE_COUNT = professionalExperience.filter(
	(role) => role.kind === 'software',
).length;
const NON_SOFTWARE_COUNT = professionalExperience.filter(
	(role) => role.kind === 'non-software',
).length;
const ROLE_COUNT = professionalExperience.length;
const PIN_MS = 360;

function snapCssPixel(value: number) {
	return Math.round(value);
}

function splitRoleDates(dates: string) {
	const [range, duration] = dates.split(' · ');
	return {
		range,
		duration: duration ?? null,
	};
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
				p-5
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
			<ul
				className="
					mt-4
					list-disc
					space-y-2
					pl-5
					text-sm
					leading-relaxed
					text-slate-700
				"
			>
				{role.bullets.map((bullet) => (
					<li key={bullet}>
						{bullet}
					</li>
				))}
			</ul>
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

export function ExperienceSection() {
	const [selectedKinds, setSelectedKinds] = useState<ExperienceKind[]>([
		'software',
	]);
	const [peekedIds, setPeekedIds] = useState<string[]>([]);
	const [filtersOpen, setFiltersOpen] = useState(true);
	const sectionRef = useRef<HTMLElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const slotRef = useRef<HTMLDivElement>(null);
	const stickyRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLOListElement>(null);
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

		let frame = 0;
		let stuck = false;
		const box = {
			left: 0,
			width: 0,
		};

		function write(
			el: HTMLElement,
			key: 'height' | 'left' | 'position' | 'top' | 'width',
			value: string,
		) {
			if(el.style[key] !== value) {
				el.style[key] = value;
			}
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
			write(barEl, 'position', '');
			write(barEl, 'top', '');
			write(barEl, 'left', '');
			write(barEl, 'width', '');
		}

		function dock() {
			const sentinelRect = sentinelEl.getBoundingClientRect();
			const sectionRect = sectionEl.getBoundingClientRect();
			const height = barEl.offsetHeight;

			if(sentinelRect.bottom <= 0) {
				stuck = true;
			}
			else if(sentinelRect.top >= 0) {
				stuck = false;
			}

			if(!stuck) {
				release();
				return;
			}

			if(barEl.style.position !== 'fixed') {
				measureBox();
			}

			write(slotEl, 'height', `${height}px`);
			barEl.setAttribute('data-stuck', '');
			write(barEl, 'position', 'fixed');
			write(barEl, 'left', `${box.left}px`);
			write(barEl, 'width', `${box.width}px`);
			write(barEl, 'top', `${
				snapCssPixel(Math.min(0, sectionRect.bottom - height))
			}px`);
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

		measureBox();
		dock();
		window.addEventListener('scroll', requestDock, { passive: true });
		window.addEventListener('resize', onResize);
		const observer = new ResizeObserver(onResize);
		observer.observe(sectionEl);

		return () => {
			if(frame !== 0) {
				window.cancelAnimationFrame(frame);
			}

			window.removeEventListener('scroll', requestDock);
			window.removeEventListener('resize', onResize);
			observer.disconnect();
			release();
		};
	}, [filtersOpen]);

	function pinFromSticky(preferredId?: string) {
		const sticky = stickyRef.current;
		const list = listRef.current;
		if(!sticky || !list) {
			return;
		}

		const stickyBottom = sticky.getBoundingClientRect().bottom;
		let item: HTMLElement | null = preferredId
			? list.querySelector(`[data-role-mark="${preferredId}"]`)
			: null;

		if(!item) {
			const rows = list.querySelectorAll<HTMLElement>('[data-role-id]');
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
		const list = listRef.current;
		if(!pin || !sticky || !list || performance.now() > pinUntilRef.current) {
			return;
		}

		const item = list.querySelector<HTMLElement>(
			`[data-role-mark="${pin.id}"]`,
		) ?? list.querySelector<HTMLElement>(
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
		const list = listRef.current;
		if(!list) {
			return;
		}

		const observer = new ResizeObserver(() => applyPin());
		observer.observe(list);
		const timer = window.setTimeout(() => {
			observer.disconnect();
			pinRef.current = null;
		}, PIN_MS);

		return () => {
			observer.disconnect();
			window.clearTimeout(timer);
		};
	}, [selectedKinds, peekedIds]);

	const hasFilter = selectedKinds.length > 0;

	function inScope(kind: ExperienceKind) {
		return selectedKinds.includes(kind);
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

	const shownCount = professionalExperience.filter((role) => inScope(role.kind)).length;

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
					Work
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
				className="-mx-gutter"
				ref={slotRef}
			>
			<div
				className="
					z-20
					bg-white
					px-gutter
					py-2
					[overflow-anchor:none]
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
								{hasFilter
									? `Showing ${shownCount} of ${ROLE_COUNT}`
									: `${ROLE_COUNT} roles`}
							</p>
						)}
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
							? 'Hide filters'
							: 'View filters'}
					</button>
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
					<p
						aria-live="polite"
						className="
							text-sm
							text-slate-600
						"
					>
						{hasFilter
							? `Showing ${shownCount} of ${ROLE_COUNT}`
							: `${ROLE_COUNT} roles`}
					</p>
				</div>
			</div>
			</div>

			<ol
				className="
					timeline-list
					relative
					mt-8
				"
				ref={listRef}
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
				{professionalExperience.map((role) => {
					const scoped = inScope(role.kind);
					const peeked = peekedIds.includes(role.id);
					const expanded = scoped || peeked;
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
							? 'border-ink bg-ink'
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
								<div
									aria-hidden={!expanded}
									className={
										expanded
											? 'timeline-fold timeline-fold-open'
											: 'timeline-fold'
									}
								>
									<div className="timeline-fold-inner">
										<DateConnector
											range={splitRoleDates(role.dates).range}
										/>
										<ExperienceRoleCard role={role} />
									</div>
								</div>
								<div
									aria-hidden={expanded}
									className={
										expanded
											? 'timeline-fold'
											: 'timeline-fold timeline-fold-open'
									}
								>
									<div className="timeline-fold-inner">
										<p
											className="
												mt-1.5
												flex
												h-4
												items-center
												justify-start
												gap-1.5
												text-sm
												leading-none
												text-slate-400
												md:hidden
											"
										>
											<span className="font-medium">
												{role.title}
											</span>
											<span aria-hidden="true">
												·
											</span>
											<span>
												{splitRoleDates(role.dates).range}
											</span>
										</p>
										<button
											aria-label={`Peek ${role.title}`}
											className="
												mt-1.5
												hidden
												h-4
												w-full
												items-center
												justify-start
												gap-1.5
												text-sm
												leading-none
												text-slate-400
												hover:text-slate-600
												md:flex
											"
											onClick={() => peekRole(role.id)}
											tabIndex={expanded ? -1 : 0}
											type="button"
										>
											<span className="font-medium">
												{role.title}
											</span>
											<span aria-hidden="true">
												·
											</span>
											<span>
												{splitRoleDates(role.dates).range}
											</span>
										</button>
									</div>
								</div>
							</div>
						</li>
					);
				})}
			</ol>

			<div
				className="
					mt-8
					flex
					flex-col
					gap-4
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
					Education
				</p>
				{education.map((entry) => (
					<article
						className="
							rounded-2xl
							border
							border-slate-100
							bg-frost/60
							p-5
							md:p-6
						"
						key={`${entry.school}-${entry.dates}`}
					>
						<h3
							className="
								text-lg
								font-semibold
								text-ink
							"
						>
							{entry.credential}
						</h3>
						<p
							className="
								mt-1
								text-sm
								font-semibold
								text-sky
							"
						>
							{entry.school}
						</p>
						<p
							className="
								text-sm
								text-slate-500
							"
						>
							{entry.place}
							{' · '}
							{entry.dates}
						</p>
						<p
							className="
								mt-3
								text-sm
								text-slate-700
							"
						>
							{entry.note}
						</p>
					</article>
				))}
			</div>
		</section>
	);
}
