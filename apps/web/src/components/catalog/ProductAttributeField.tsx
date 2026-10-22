'use client';

import { useMemo, useState } from 'react';
import type { CatalogAttributeDefinition } from '../../lib/catalog-api';

type ProductAttributeFieldProps = {
	catalog: CatalogAttributeDefinition[];
	valueIds: string[];
	onChange: (next: string[]) => void;
};

type FlatValue = {
	attributeId: string;
	attributeName: string;
	valueId: string;
	valueLabel: string;
};

function normalizeQuery(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function ProductAttributeField({
	catalog,
	valueIds,
	onChange,
}: ProductAttributeFieldProps) {
	const [query, setQuery] = useState('');
	const [activeAttributeId, setActiveAttributeId] = useState<string | null>(null);

	const flatValues = useMemo<FlatValue[]>(() => {
		const rows: FlatValue[] = [];
		for(const attribute of catalog) {
			for(const value of attribute.values) {
				rows.push({
					attributeId: attribute.id,
					attributeName: attribute.name,
					valueId: value.id,
					valueLabel: value.value,
				});
			}
		}
		return rows;
	}, [catalog]);

	const valueById = useMemo(() => {
		const map = new Map<string, FlatValue>();
		for(const row of flatValues) {
			map.set(row.valueId, row);
		}
		return map;
	}, [flatValues]);

	const selected = useMemo(() => new Set(valueIds), [valueIds]);

	const selectedByAttribute = useMemo(() => {
		const groups = new Map<string, { attributeName: string; values: FlatValue[] }>();
		for(const id of valueIds) {
			const row = valueById.get(id);
			if(!row) {
				continue;
			}
			const existing = groups.get(row.attributeId);
			if(existing) {
				existing.values.push(row);
			}
			else {
				groups.set(row.attributeId, {
					attributeName: row.attributeName,
					values: [row],
				});
			}
		}
		return [...groups.entries()].map(([attributeId, group]) => ({
			attributeId,
			...group,
		}));
	}, [valueIds, valueById]);

	const normalizedQuery = normalizeQuery(query);

	const matchingAttributes = useMemo(() => {
		if(!normalizedQuery) {
			return catalog.slice(0, 12);
		}
		return catalog
			.filter((attribute) =>
				attribute.name.toLowerCase().includes(normalizedQuery),
			)
			.slice(0, 12);
	}, [catalog, normalizedQuery]);

	const activeAttribute = useMemo(
		() => catalog.find((row) => row.id === activeAttributeId) ?? null,
		[catalog, activeAttributeId],
	);

	const matchingValues = useMemo(() => {
		const source = activeAttribute
			? flatValues.filter((row) => row.attributeId === activeAttribute.id)
			: flatValues;

		if(!normalizedQuery || activeAttribute) {
			const valueQuery = activeAttribute ? normalizedQuery : '';
			const filtered = valueQuery
				? source.filter((row) =>
					row.valueLabel.toLowerCase().includes(valueQuery),
				)
				: source;
			return filtered.slice(0, 40);
		}

		return source
			.filter((row) => {
				const haystack = `${row.attributeName} ${row.valueLabel}`.toLowerCase();
				return haystack.includes(normalizedQuery);
			})
			.slice(0, 40);
	}, [flatValues, activeAttribute, normalizedQuery]);

	const addValue = (valueId: string) => {
		if(selected.has(valueId)) {
			return;
		}
		onChange([...valueIds, valueId]);
		setQuery('');
	};

	const removeValue = (valueId: string) => {
		onChange(valueIds.filter((id) => id !== valueId));
	};

	const clearAttribute = (attributeId: string) => {
		const idsInAttribute = new Set(
			flatValues
				.filter((row) => row.attributeId === attributeId)
				.map((row) => row.valueId),
		);
		onChange(valueIds.filter((id) => !idsInAttribute.has(id)));
	};

	if(catalog.length === 0) {
		return (
			<p className="text-sm text-slate-500">
				No attributes seeded yet.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			{selectedByAttribute.length > 0
				? (
						<ul className="space-y-2">
							{selectedByAttribute.map((group) => (
								<li
									key={group.attributeId}
									className="
										flex
										flex-wrap
										items-start
										gap-2
										rounded-lg
										border
										border-slate-200
										bg-slate-50
										px-3
										py-2
									"
								>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
											{group.attributeName}
										</p>
										<div className="mt-1.5 flex flex-wrap gap-1.5">
											{group.values.map((row) => (
												<button
													key={row.valueId}
													type="button"
													className="
														inline-flex
														items-center
														gap-1
														rounded-full
														bg-white
														px-2.5
														py-1
														text-xs
														font-semibold
														text-slate-700
														ring-1
														ring-slate-200
														hover:bg-slate-100
													"
													onClick={() => removeValue(row.valueId)}
													title={`Remove ${row.valueLabel}`}
												>
													{row.valueLabel}
													<span aria-hidden>
														×
													</span>
												</button>
											))}
										</div>
									</div>
									<button
										type="button"
										className="
											shrink-0
											text-xs
											font-medium
											text-slate-500
											underline-offset-2
											hover:text-sky
											hover:underline
										"
										onClick={() => clearAttribute(group.attributeId)}
									>
										Clear
									</button>
								</li>
							))}
						</ul>
					)
				: (
						<p className="text-sm text-slate-500">
							No attributes on this product yet.
						</p>
					)
			}

			<div className="space-y-2">
				<label className="block text-sm">
					<span className="font-semibold text-slate-700">
						{activeAttribute
							? `Add ${activeAttribute.name}`
							: 'Find an attribute or value'}
					</span>
					<input
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-slate-300
							px-3
							py-2
							text-sm
							outline-none
							focus:border-sky
						"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={
							activeAttribute
								? `Search ${activeAttribute.name} values…`
								: 'Search by name (e.g. color, cotton)…'
						}
						autoComplete="off"
					/>
				</label>

				{activeAttribute
					? (
							<button
								type="button"
								className="
									text-xs
									font-medium
									text-slate-500
									underline-offset-2
									hover:text-sky
									hover:underline
								"
								onClick={() => {
									setActiveAttributeId(null);
									setQuery('');
								}}
							>
								← All attributes
							</button>
						)
					: null
				}

				{!activeAttribute
					? (
							<div className="space-y-1">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
									Attributes
								</p>
								<ul
									className="
										max-h-40
										overflow-y-auto
										rounded-lg
										border
										border-slate-200
									"
								>
									{matchingAttributes.length === 0
										? (
												<li className="px-3 py-2 text-sm text-slate-500">
													No attributes match.
												</li>
											)
										: matchingAttributes.map((attribute) => {
											const selectedCount = attribute.values.filter((value) =>
												selected.has(value.id),
											).length;
											return (
												<li key={attribute.id}>
													<button
														type="button"
														className="
															flex
															w-full
															items-center
															justify-between
															gap-2
															px-3
															py-2
															text-left
															text-sm
															hover:bg-slate-50
														"
														onClick={() => {
															setActiveAttributeId(attribute.id);
															setQuery('');
														}}
													>
														<span className="font-medium text-slate-800">
															{attribute.name}
														</span>
														<span className="shrink-0 text-xs text-slate-500">
															{selectedCount > 0
																? `${selectedCount} selected · `
																: ''}
															{attribute.values.length} values
														</span>
													</button>
												</li>
											);
										})
									}
								</ul>
							</div>
						)
					: null
				}

				{(activeAttribute || normalizedQuery)
					? (
							<div className="space-y-1">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
									{activeAttribute ? 'Values' : 'Matching values'}
								</p>
								<ul
									className="
										max-h-52
										overflow-y-auto
										rounded-lg
										border
										border-slate-200
									"
								>
									{matchingValues.length === 0
										? (
												<li className="px-3 py-2 text-sm text-slate-500">
													No values match.
												</li>
											)
										: matchingValues.map((row) => {
											const isOn = selected.has(row.valueId);
											return (
												<li key={row.valueId}>
													<button
														type="button"
														className={`
															flex
															w-full
															items-center
															justify-between
															gap-2
															px-3
															py-2
															text-left
															text-sm
															${isOn
														? 'bg-slate-100 text-slate-500'
														: 'hover:bg-slate-50'
													}
														`}
														onClick={() => {
															if(isOn) {
																removeValue(row.valueId);
															}
															else {
																addValue(row.valueId);
															}
														}}
													>
														<span>
															{!activeAttribute
																? (
																		<>
																			<span className="font-medium text-slate-800">
																				{row.attributeName}
																			</span>
																			<span className="text-slate-400">
																				{' · '}
																			</span>
																		</>
																	)
																: null
															}
															<span className={activeAttribute ? 'font-medium text-slate-800' : 'text-slate-700'}>
																{row.valueLabel}
															</span>
														</span>
														<span className="shrink-0 text-xs font-semibold text-slate-500">
															{isOn ? 'Remove' : 'Add'}
														</span>
													</button>
												</li>
											);
										})
									}
								</ul>
							</div>
						)
					: null
				}
			</div>
		</div>
	);
}
