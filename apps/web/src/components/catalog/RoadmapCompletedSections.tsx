'use client';

import { useId, useState } from 'react';
import type { RoadmapItem } from '../../data/place-et-marque-roadmap';

type CompletedGroup = {
	area: string;
	label: string;
	items: RoadmapItem[];
};

function CompletedItemList({ items }: { items: RoadmapItem[] }) {
	return (
		<ul
			className="
				columns-1
				gap-x-8
				sm:columns-2
			"
		>
			{items.map((item) => (
				<li
					className="
						mb-2
						break-inside-avoid
						border-l-2
						border-asgreen
						pl-3
						text-sm
						leading-snug
						text-slate-800
					"
					key={item.id}
				>
					{item.title}
				</li>
			))}
		</ul>
	);
}

function AreaDetails({ group }: { group: CompletedGroup }) {
	const panelId = useId();
	const [open, setOpen] = useState(false);
	const preview = group.items.slice(0, 3);
	const rest = group.items.slice(3);
	const hasMore = rest.length > 0;

	return (
		<div
			className="
				flex
				flex-col
				gap-3
			"
		>
			<div
				className="
					flex
					flex-wrap
					items-baseline
					justify-between
					gap-2
				"
			>
				<h3
					className="
						text-sm
						font-semibold
						uppercase
						tracking-[0.14em]
						text-slate-500
					"
				>
					{group.label}
					<span
						className="
							ml-2
							font-medium
							normal-case
							tracking-normal
							text-slate-400
						"
					>
						{group.items.length}
					</span>
				</h3>
				{hasMore
					? (
							<button
								aria-controls={panelId}
								aria-expanded={open}
								className="
									min-h-11
									rounded-full
									px-3
									text-sm
									font-semibold
									text-sky
									underline
									underline-offset-2
									max-[399px]:px-2
								"
								onClick={() => setOpen((value) => !value)}
								type="button"
							>
								{open
									? 'Show less'
									: `Show all ${group.items.length}`
								}
							</button>
						)
					: null
				}
			</div>
			<div id={panelId}>
				<CompletedItemList items={open ? group.items : preview} />
			</div>
			{hasMore && !open
				? (
						<p
							className="
								text-xs
								text-slate-500
							"
						>
							{rest.length} more in this area
						</p>
					)
				: null
			}
		</div>
	);
}

export function RoadmapCompletedSections({
	groups,
	highlights,
}: {
	groups: CompletedGroup[];
	highlights: RoadmapItem[];
}) {
	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			{highlights.length > 0
				? (
						<div
							className="
								flex
								flex-col
								gap-3
							"
						>
							<h3
								className="
									text-sm
									font-semibold
									uppercase
									tracking-[0.14em]
									text-slate-500
								"
							>
								Highlights
							</h3>
							<CompletedItemList items={highlights} />
						</div>
					)
				: null
			}

			{groups.map((group) => (
				<AreaDetails
					group={group}
					key={group.area}
				/>
			))}
		</div>
	);
}
