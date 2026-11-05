'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { CrmShell } from '../../components/layout/CrmShell';
import { AuthApiError } from '../../lib/auth-api';
import {
	createGlobalUom,
	listUoms,
	type UnitOfMeasure,
} from '../../lib/crm-api';

export default function UomsAdminPage() {
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [code, setCode] = useState('');
	const [label, setLabel] = useState('');
	const [dimensionKey, setDimensionKey] = useState('count');
	const [factorToReference, setFactorToReference] = useState('1');
	const [aliases, setAliases] = useState<string[]>([]);
	const [aliasDraft, setAliasDraft] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const globals = useMemo(
		() => uoms.filter((row) => !row.vendorId),
		[uoms],
	);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setUoms(await listUoms());
		}
		catch(loadError) {
			setUoms([]);
			setError(
				loadError instanceof AuthApiError
					? loadError.message
					: 'Could not load units.',
			);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const addAlias = (raw: string) => {
		const alias = raw.trim();
		if(!alias || aliases.includes(alias)) {
			setAliasDraft('');
			return;
		}
		setAliases([...aliases, alias.slice(0, 40)]);
		setAliasDraft('');
	};

	const onAliasKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if(event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addAlias(aliasDraft);
		}
	};

	async function onCreate(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await createGlobalUom({
				code: code.trim(),
				label: label.trim(),
				dimensionKey: dimensionKey.trim().toLowerCase(),
				factorToReference: factorToReference.trim(),
				aliases,
			});
			setCode('');
			setLabel('');
			setDimensionKey('count');
			setFactorToReference('1');
			setAliases([]);
			setAliasDraft('');
			await refresh();
		}
		catch(submitError) {
			setError(
				submitError instanceof AuthApiError
					? submitError.message
					: 'Could not create that unit.',
			);
		}
		finally {
			setSubmitting(false);
		}
	}

	return (
		<CrmShell>
			<div
				className="
					mx-auto
					max-w-3xl
				"
			>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
						text-white
					"
				>
					Units of measure
				</h1>
				<p
					className="
						mt-3
						text-sm
						text-mist/75
					"
				>
					Manage global units shared across Place et Marque. Vendor units stay
					on the storefront; cross-vendor name collisions email merge links here.
				</p>
				<p
					className="
						mt-2
						text-sm
						text-mist/60
					"
				>
					Open a merge email link, or go to{' '}
					<Link
						href="/uom-merges"
						className="
							text-glow
							underline-offset-2
							hover:underline
						"
					>
						UOM approvals
					</Link>
					{' '}
					with a token.
				</p>

				{error
					? (
							<p
								className="
									mt-4
									rounded-lg
									border
									border-warn/40
									bg-warn/10
									px-3
									py-2
									text-sm
									text-warn
								"
								role="alert"
							>
								{error}
							</p>
						)
					: null
				}

				<section
					className="
						mt-8
						rounded-xl
						border
						border-line
						bg-panel/70
						px-5
						py-4
					"
				>
					<h2
						className="
							text-lg
							font-semibold
							text-white
						"
					>
						Create global unit
					</h2>
					<form
						className="
							mt-4
							grid
							gap-4
							md:grid-cols-2
						"
						onSubmit={(event) => {
							void onCreate(event);
						}}
					>
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Name / code
							</span>
							<input
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
								"
								value={code}
								onChange={(event) => setCode(event.target.value)}
								required
								maxLength={40}
								placeholder="ft"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Label
							</span>
							<input
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
								"
								value={label}
								onChange={(event) => setLabel(event.target.value)}
								required
								maxLength={80}
								placeholder="Foot"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Dimension
							</span>
							<input
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
								"
								value={dimensionKey}
								onChange={(event) => setDimensionKey(event.target.value)}
								required
								maxLength={40}
							/>
						</label>
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Factor to reference
							</span>
							<input
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
								"
								value={factorToReference}
								onChange={(event) => setFactorToReference(event.target.value)}
								required
							/>
						</label>
						<div
							className="
								md:col-span-2
							"
						>
							<span
								className="
									block
									text-sm
									font-medium
									text-mist
								"
							>
								Aliases
							</span>
							<div
								className="
									mt-1
									flex
									flex-wrap
									gap-2
								"
							>
								{aliases.map((alias) => (
									<button
										key={alias}
										type="button"
										className="
											rounded-full
											border
											border-line
											px-2.5
											py-1
											text-xs
											text-mist
										"
										onClick={() => {
											setAliases(aliases.filter((row) => row !== alias));
										}}
									>
										{alias} ×
									</button>
								))}
							</div>
							<input
								className="
									mt-2
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
								"
								value={aliasDraft}
								onChange={(event) => setAliasDraft(event.target.value)}
								onKeyDown={onAliasKeyDown}
								onBlur={() => addAlias(aliasDraft)}
								placeholder="Type alias and press Enter"
							/>
						</div>
						<button
							type="submit"
							disabled={submitting}
							className="
								self-start
								rounded-lg
								bg-glow
								px-4
								py-2
								text-sm
								font-semibold
								text-rail
								disabled:opacity-60
								md:col-span-2
							"
						>
							{submitting
								? 'Creating…'
								: 'Create global unit'
							}
						</button>
					</form>
				</section>

				<section
					className="
						mt-10
						flex
						flex-col
						gap-3
					"
				>
					<h2
						className="
							text-lg
							font-semibold
							text-white
						"
					>
						Global units
					</h2>
					{loading
						? (
								<p className="text-sm text-mist/60">
									Loading units…
								</p>
							)
						: null
					}
					{!loading && globals.length === 0 && !error
						? (
								<p className="text-sm text-mist/60">
									No global units yet.
								</p>
							)
						: null
					}
					<ul
						className="
							flex
							flex-col
							gap-3
						"
					>
						{globals.map((uom) => (
							<li
								key={uom.id}
								className="
									rounded-xl
									border
									border-line
									bg-panel/70
									px-5
									py-4
								"
							>
								<p className="font-semibold text-white">
									{uom.code} · {uom.label}
								</p>
								<p
									className="
										mt-1
										text-sm
										text-mist/65
									"
								>
									{uom.dimensionKey} · factor {uom.factorToReference}
								</p>
								{(uom.aliases?.length ?? 0) > 0
									? (
											<p
												className="
													mt-1
													text-xs
													text-mist/50
												"
											>
												Aliases: {uom.aliases.join(', ')}
											</p>
										)
									: null
								}
							</li>
						))}
					</ul>
				</section>
			</div>
		</CrmShell>
	);
}
