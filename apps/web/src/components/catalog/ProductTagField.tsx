'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { listPopularTags } from '../../lib/catalog-api';

type ProductTagFieldProps = {
	value: string[];
	onChange: (next: string[]) => void;
	vendorId?: string;
};

function normalizeTag(raw: string): string {
	return raw.trim().replace(/\s+/g, ' ').slice(0, 60);
}

export function ProductTagField({ value, onChange, vendorId }: ProductTagFieldProps) {
	const [draft, setDraft] = useState('');
	const [popular, setPopular] = useState<Array<{ tag: string; count: number }>>([]);
	const [pickerOpen, setPickerOpen] = useState(false);

	useEffect(() => {
		if(!vendorId) {
			setPopular([]);
			return;
		}
		listPopularTags({ vendorId })
			.then(setPopular)
			.catch(() => setPopular([]));
	}, [vendorId]);

	const selected = useMemo(() => new Set(value), [value]);

	const frequent = popular.slice(0, 8);
	const remainder = popular.slice(8);

	const addTag = (raw: string) => {
		const tag = normalizeTag(raw);
		if(!tag || selected.has(tag)) {
			setDraft('');
			return;
		}
		onChange([...value, tag]);
		setDraft('');
	};

	const removeTag = (tag: string) => {
		onChange(value.filter((row) => row !== tag));
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if(event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addTag(draft);
		}
		else if(event.key === 'Backspace' && !draft && value.length > 0) {
			removeTag(value[value.length - 1]);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<label className="block text-sm">
				<span className="font-semibold">
					Tags
				</span>
				<p className="mt-1 text-xs text-slate-500">
					Freeform labels for discovery. Type a tag and press Enter, or pick from frequent tags.
				</p>
				<div
					className="
						mt-2
						flex
						min-h-[42px]
						flex-wrap
						items-center
						gap-2
						rounded-lg
						border
						border-slate-300
						bg-white
						px-3
						py-2
					"
				>
					{value.map((tag) => (
						<button
							className="
								inline-flex
								items-center
								gap-1
								rounded-full
								bg-slate-100
								px-2.5
								py-1
								text-xs
								font-semibold
								text-slate-700
								hover:bg-slate-200
							"
							key={tag}
							type="button"
							onClick={() => removeTag(tag)}
						>
							{tag}
							<span aria-hidden>
								×
							</span>
						</button>
					))}
					<input
						className="
							min-w-[8rem]
							flex-1
							border-0
							bg-transparent
							py-1
							text-sm
							outline-none
						"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={onKeyDown}
						placeholder={value.length ? 'Add another…' : 'Type a tag and press Enter'}
					/>
				</div>
			</label>

			<div>
				<button
					className="
						text-sm
						font-semibold
						text-sky
						hover:underline
					"
					type="button"
					onClick={() => setPickerOpen((open) => !open)}
				>
					{pickerOpen ? 'Hide tag picker' : 'Browse frequent tags'}
				</button>
				{pickerOpen
					? (
							<div
								className="
									mt-2
									rounded-xl
									border
									border-slate-200
									bg-slate-50
									p-3
								"
							>
								{frequent.length === 0 && remainder.length === 0
									? (
											<p className="text-sm text-slate-500">
												No frequent tags yet for this vendor. Tags you add will
												appear here for faster reuse.
											</p>
										)
									: null}
								{frequent.length > 0
									? (
											<div className="mb-3">
												<p
													className="
														text-[11px]
														font-semibold
														uppercase
														tracking-wide
														text-slate-500
													"
												>
													Frequently used
												</p>
												<div className="mt-2 flex flex-wrap gap-2">
													{frequent.map((row) => {
														const active = selected.has(row.tag);
														return (
															<button
																className={
																	active
																		? 'rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white'
																		: 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky hover:text-sky'
																}
																key={`freq-${row.tag}`}
																type="button"
																onClick={() => {
																	if(active) {
																		removeTag(row.tag);
																	}
																	else {
																		addTag(row.tag);
																	}
																}}
															>
																{row.tag}
																{' '}
																<span className="opacity-70">
																	· {row.count}
																</span>
															</button>
														);
													})}
												</div>
											</div>
										)
									: null}
								{remainder.length > 0
									? (
											<div>
												<p
													className="
														text-[11px]
														font-semibold
														uppercase
														tracking-wide
														text-slate-500
													"
												>
													More tags
												</p>
												<div className="mt-2 flex flex-wrap gap-2">
													{remainder.map((row) => {
														const active = selected.has(row.tag);
														return (
															<button
																className={
																	active
																		? 'rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white'
																		: 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky hover:text-sky'
																}
																key={`more-${row.tag}`}
																type="button"
																onClick={() => {
																	if(active) {
																		removeTag(row.tag);
																	}
																	else {
																		addTag(row.tag);
																	}
																}}
															>
																{row.tag}
															</button>
														);
													})}
												</div>
											</div>
										)
									: null}
							</div>
						)
					: null}
			</div>
		</div>
	);
}
