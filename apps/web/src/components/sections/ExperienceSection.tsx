'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	education,
	professionalExperience,
	type ExperienceKind,
	type ExperienceRole,
} from '../../data/experience';

const KIND_LABEL: Record<ExperienceKind, string> = {
	software: 'Software',
	'non-software': 'Non-software',
};

const SOFTWARE_COUNT = professionalExperience.filter(
	(role) => role.kind === 'software',
).length;
const NON_SOFTWARE_COUNT = professionalExperience.filter(
	(role) => role.kind === 'non-software',
).length;
const ROLE_COUNT = professionalExperience.length;
const PIN_MS = 360;

function ExperienceRoleCard({
	className = '',
	role,
}: {
	className?: string;
	role: ExperienceRole;
}) {
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
					flex-col
					gap-1
					md:flex-row
					md:items-baseline
					md:justify-between
					md:gap-6
				"
			>
				<h3
					className="
						text-lg
						font-semibold
						text-ink
					"
				>
					{role.title}
				</h3>
				<p
					className="
						shrink-0
						text-sm
						text-slate-500
					"
				>
					{role.dates}
				</p>
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
					h-4
					w-4
					shrink-0
					rounded
					border-slate-300
					accent-ink
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

function FilterChip({
	children,
	onClick,
}: {
	children: string;
	onClick: () => void;
}) {
	return (
		<button
			className="
				inline-flex
				items-center
				gap-2
				rounded-full
				border
				border-slate-300
				bg-white
				px-3
				py-1
				text-xs
				font-semibold
				text-slate-700
			"
			onClick={onClick}
			type="button"
		>
			{children}
			<span
				aria-hidden="true"
				className="text-slate-400"
			>
				×
			</span>
		</button>
	);
}

export function ExperienceSection() {
	const [selectedKinds, setSelectedKinds] = useState<ExperienceKind[]>([
		'software',
	]);
	const [peekedIds, setPeekedIds] = useState<string[]>([]);
	const [stuck, setStuck] = useState(false);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const stickyRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLOListElement>(null);
	const pinRef = useRef<{ id: string; offset: number } | null>(null);
	const pinUntilRef = useRef(0);

	useEffect(() => {
		const node = sentinelRef.current;
		if(!node) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => setStuck(!entry.isIntersecting),
			{ threshold: 0 },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

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

	function clearKind(kind: ExperienceKind) {
		pinFromSticky();
		setSelectedKinds((current) => current.filter((row) => row !== kind));
	}

	function clearFilters() {
		pinFromSticky();
		setSelectedKinds([]);
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
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-8
				shadow-sm
			"
			id="experience"
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
				className="h-px"
				ref={sentinelRef}
			/>
			<div
				className={
					stuck
						? `
							sticky
							top-0
							z-20
							-mx-8
							mt-6
							border-y
							border-slate-200
							bg-white/95
							px-8
							py-3
							shadow-[0_10px_30px_rgba(13,27,42,0.06)]
							backdrop-blur-md
						`
						: `
							sticky
							top-0
							z-20
							-mx-8
							mt-6
							border-y
							border-slate-200/80
							bg-white/95
							px-8
							py-3
							backdrop-blur-md
						`
				}
				ref={stickyRef}
			>
				<div
					className="
						flex
						flex-col
						gap-3
						sm:flex-row
						sm:items-end
						sm:justify-between
					"
				>
					<div>
						<p
							className="
								text-[11px]
								font-semibold
								uppercase
								tracking-[0.2em]
								text-slate-500
							"
						>
							Kind
						</p>
						<div
							className="
								mt-2
								flex
								flex-wrap
								items-center
								gap-x-5
								gap-y-2
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
					</div>
					<div
						className="
							flex
							flex-wrap
							items-center
							gap-3
							text-sm
							text-slate-600
						"
					>
						<p aria-live="polite">
							{hasFilter
								? `Showing ${shownCount} of ${ROLE_COUNT}`
								: `${ROLE_COUNT} roles`}
						</p>
						{hasFilter
							? (
								<button
									className="
										font-semibold
										text-ink
										underline-offset-4
										hover:underline
									"
									onClick={clearFilters}
									type="button"
								>
									Clear all
								</button>
							)
							: null}
					</div>
				</div>
				<div
					className={
						hasFilter
							? 'timeline-fold timeline-fold-open'
							: 'timeline-fold'
					}
				>
					<div className="timeline-fold-inner">
						<div
							className="
								mt-3
								flex
								flex-wrap
								gap-2
							"
						>
							{selectedKinds.map((kind) => (
								<FilterChip
									key={kind}
									onClick={() => clearKind(kind)}
								>
									{`Kind: ${KIND_LABEL[kind]}`}
								</FilterChip>
							))}
						</div>
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
										gap-5
										pb-6
										transition-[padding]
										duration-300
										last:pb-0
									`
									: `
										relative
										flex
										items-start
										gap-5
										pb-3
										transition-[padding]
										duration-300
										last:pb-0
									`
							}
							data-role-id={role.id}
							key={role.id}
						>
							<div
								className="
									relative
									z-10
									mt-1.5
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
											className={markClass}
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
										<button
											aria-label={`Peek ${role.title}`}
											className="
												py-0.5
												text-left
												text-sm
												text-slate-400
												hover:text-slate-600
											"
											onClick={() => peekRole(role.id)}
											tabIndex={expanded ? -1 : 0}
											type="button"
										>
											<span className="font-medium">
												{role.title}
											</span>
											{' · '}
											{role.dates.split(' · ')[0]}
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
