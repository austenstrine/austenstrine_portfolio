'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
	createUom,
	listMyVendors,
	listUoms,
	type UnitOfMeasure,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { useSession } from '../../../lib/useSession';

function UomManagePageContent() {
	const { user } = useSession();
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [vendorId, setVendorId] = useState('');
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [loading, setLoading] = useState(true);
	const [code, setCode] = useState('');
	const [label, setLabel] = useState('');
	const [dimensionKey, setDimensionKey] = useState('count');
	const [factorToReference, setFactorToReference] = useState('1');
	const [aliases, setAliases] = useState<string[]>([]);
	const [aliasDraft, setAliasDraft] = useState('');
	const [asGlobal, setAsGlobal] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const isSuperVendor = vendors.some(
		(vendor) =>
			vendor.isSuperVendor
			&& (vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR'),
	);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const vendorRows = await listMyVendors();
			setVendors(vendorRows);
			const selected =
				vendorId && vendorRows.some((row) => row.id === vendorId)
					? vendorId
					: vendorRows[0]?.id ?? '';
			if(selected !== vendorId) {
				setVendorId(selected);
			}
			setUoms(await listUoms(selected || undefined));
		}
		catch {
			setVendors([]);
			setUoms([]);
		}
		finally {
			setLoading(false);
		}
	}, [vendorId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if(!vendorId) {
			return;
		}
		listUoms(vendorId)
			.then(setUoms)
			.catch(() => setUoms([]));
	}, [vendorId]);

	const globals = useMemo(
		() => uoms.filter((row) => !row.vendorId),
		[uoms],
	);
	const mine = useMemo(
		() => uoms.filter((row) => row.vendorId === vendorId),
		[uoms, vendorId],
	);

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

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await createUom({
				code: code.trim(),
				label: label.trim(),
				dimensionKey: dimensionKey.trim().toLowerCase(),
				factorToReference: factorToReference.trim(),
				aliases,
				vendorId: asGlobal && isSuperVendor ? undefined : vendorId,
			});
			setCode('');
			setLabel('');
			setDimensionKey('count');
			setFactorToReference('1');
			setAliases([]);
			setAliasDraft('');
			setAsGlobal(false);
			setUoms(await listUoms(vendorId || undefined));
		}
		catch(submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not create UOM.');
		}
		finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="
				flex
				flex-col
				gap-8
			"
		>
			<div>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Units of measure
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Globals are units shared across all of Place et Marque. Each vendor can also define their own UOMs
					with aliases (for example ft, foot, and &apos;). Matching names across vendors
					trigger an automerge review email.
				</p>
			</div>

			{user
				? (
						<p className="text-sm text-slate-600">
							Signed in as {user.email}
						</p>
					)
				: null
			}

			{vendors.length > 1
				? (
						<label
							className="
								block
								max-w-md
								text-sm
							"
						>
							<span className="font-semibold">
								Vendor
							</span>
							<select
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-slate-300
									px-3
									py-2
								"
								value={vendorId}
								onChange={(event) => setVendorId(event.target.value)}
							>
								{vendors.map((vendor) => (
									<option
										key={vendor.id}
										value={vendor.id}
									>
										{vendor.name}
									</option>
								))}
							</select>
						</label>
					)
				: null
			}

			{vendorId
				? (
						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<h2 className="text-lg font-semibold">
								Create UOM
							</h2>
							<form
								className="
									mt-4
									grid
									gap-4
									md:grid-cols-2
								"
								onSubmit={onSubmit}
							>
								<label className="block text-sm">
									<span className="font-semibold">
										Name / code
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
										"
										value={code}
										onChange={(event) => setCode(event.target.value)}
										required
										maxLength={40}
										placeholder="ft"
									/>
									<span
										className="
											mt-1
											block
											text-xs
											text-slate-500
										"
									>
										Case-sensitive. Matching names/aliases across vendors may trigger a merge review.
									</span>
								</label>
								<label className="block text-sm">
									<span className="font-semibold">
										Label
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
										"
										value={label}
										onChange={(event) => setLabel(event.target.value)}
										required
										maxLength={80}
										placeholder="Foot"
									/>
								</label>
								<label className="block text-sm">
									<span className="font-semibold">
										Dimension
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
										"
										value={dimensionKey}
										onChange={(event) => setDimensionKey(event.target.value)}
										required
										placeholder="length"
									/>
								</label>
								<label className="block text-sm">
									<span className="font-semibold">
										Factor to reference
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
										"
										value={factorToReference}
										onChange={(event) => setFactorToReference(event.target.value)}
										required
									/>
								</label>
								<div className="md:col-span-2">
									<span className="text-sm font-semibold">
										Aliases
									</span>
									<div
										className="
											mt-1
											flex
											min-h-[42px]
											flex-wrap
											items-center
											gap-2
											rounded-lg
											border
											border-slate-300
											px-3
											py-2
										"
									>
										{aliases.map((alias) => (
											<button
												className="
													rounded-full
													bg-slate-100
													px-2.5
													py-1
													text-xs
													font-semibold
													text-slate-700
												"
												key={alias}
												type="button"
												onClick={() =>
													setAliases(aliases.filter((row) => row !== alias))
												}
											>
												{alias} ×
											</button>
										))}
										<input
											className="
												min-w-[8rem]
												flex-1
												border-0
												bg-transparent
												text-sm
												outline-none
											"
											value={aliasDraft}
											onChange={(event) => setAliasDraft(event.target.value)}
											onKeyDown={onAliasKeyDown}
											placeholder="Type alias and press Enter"
										/>
									</div>
								</div>
								{isSuperVendor
									? (
											<label
												className="
													flex
													items-center
													gap-2
													text-sm
													md:col-span-2
												"
											>
												<input
													type="checkbox"
													checked={asGlobal}
													onChange={(event) => setAsGlobal(event.target.checked)}
												/>
												Create as global UOM
											</label>
										)
									: null
								}
								{error
									? (
											<p
												className="
													text-sm
													text-red-700
													md:col-span-2
												"
											>
												{error}
											</p>
										)
									: null
								}
								<button
									className="
										self-start
										rounded-full
										bg-ink
										px-4
										py-2.5
										text-sm
										font-semibold
										text-white
										hover:bg-sky
										disabled:opacity-60
									"
									type="submit"
									disabled={submitting || (!asGlobal && !vendorId)}
								>
									{submitting
										? 'Creating…'
										: 'Create UOM'
									}
								</button>
							</form>
						</section>
					)
				: null
			}

			<section
				className="
					flex
					flex-col
					gap-3
				"
			>
				<h2 className="text-lg font-semibold">
					Global units
				</h2>
				{loading
					? (
							<p className="text-sm text-slate-500">
								Loading…
							</p>
						)
					: null
				}
				{!loading && globals.length === 0
					? (
							<p className="text-sm text-slate-500">
								No global units yet.
							</p>
						)
					: null
				}
				{globals.map((uom) => (
					<div
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
						"
						key={uom.id}
					>
						<p className="font-semibold">
							{uom.code} · {uom.label}
						</p>
						<p className="text-sm text-slate-600">
							{uom.dimensionKey} · factor {uom.factorToReference}
						</p>
						{(uom.aliases?.length ?? 0) > 0
							? (
									<p
										className="
											mt-1
											text-xs
											text-slate-500
										"
									>
										Aliases: {uom.aliases?.join(', ')}
									</p>
								)
							: null
						}
					</div>
				))}
			</section>

			<section
				className="
					flex
					flex-col
					gap-3
				"
			>
				<h2 className="text-lg font-semibold">
					Your vendor units
				</h2>
				{!loading && mine.length === 0
					? (
							<p className="text-sm text-slate-500">
								No vendor-specific units yet. Create one above.
							</p>
						)
					: null
				}
				{mine.map((uom) => (
					<div
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
						"
						key={uom.id}
					>
						<p className="font-semibold">
							{uom.code} · {uom.label}
						</p>
						<p className="text-sm text-slate-600">
							{uom.dimensionKey} · factor {uom.factorToReference}
						</p>
						{(uom.aliases?.length ?? 0) > 0
							? (
									<p
										className="
											mt-1
											text-xs
											text-slate-500
										"
									>
										Aliases: {uom.aliases?.join(', ')}
									</p>
								)
							: null
						}
					</div>
				))}
			</section>
		</div>
	);
}

export default function UomManagePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess
				vendorRequired
				reasonKey="uoms"
			>
				<UomManagePageContent />
			</RequireAccess>
		</Suspense>
	);
}
