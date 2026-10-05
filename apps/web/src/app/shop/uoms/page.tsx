'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createUom, listUoms, type UnitOfMeasure } from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';

export default function UomManagePage() {
	const { user, loading: sessionLoading } = useSession();
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [loading, setLoading] = useState(true);
	const [code, setCode] = useState('');
	const [label, setLabel] = useState('');
	const [dimensionKey, setDimensionKey] = useState('count');
	const [factorToReference, setFactorToReference] = useState('1');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setUoms(await listUoms());
		} catch {
			setUoms([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await createUom({
				code: code.trim().toUpperCase(),
				label: label.trim(),
				dimensionKey: dimensionKey.trim().toLowerCase(),
				factorToReference: factorToReference.trim(),
			});
			setCode('');
			setLabel('');
			setDimensionKey('count');
			setFactorToReference('1');
			await refresh();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not create UOM.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">Units of measure</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					UOMs are data rows, not schema enums. Add feet, spools, boxes, packs, or anything else
					before you price offerings.
				</p>
			</div>

			{!sessionLoading && !user ? (
				<p className="text-sm text-amber-800">
					Sign in to create UOMs.{' '}
					<a href="/auth/login" className="font-semibold text-sky hover:underline">
						Sign in
					</a>
				</p>
			) : null}

			{user ? (
				<section className="rounded-2xl border border-slate-200 bg-white p-5">
					<h2 className="text-lg font-semibold">Create UOM</h2>
					<form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
						<label className="block text-sm">
							<span className="font-semibold">Code</span>
							<input
								value={code}
								onChange={(event) => setCode(event.target.value.toUpperCase())}
								required
								placeholder="FT"
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Label</span>
							<input
								value={label}
								onChange={(event) => setLabel(event.target.value)}
								required
								placeholder="Foot"
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Dimension</span>
							<input
								value={dimensionKey}
								onChange={(event) => setDimensionKey(event.target.value)}
								required
								placeholder="length"
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Factor to reference</span>
							<input
								value={factorToReference}
								onChange={(event) => setFactorToReference(event.target.value)}
								required
								placeholder="0.3048"
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
						{error ? <p className="text-sm text-red-700 md:col-span-2">{error}</p> : null}
						<button
							type="submit"
							disabled={submitting}
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
						>
							{submitting ? 'Creating…' : 'Create UOM'}
						</button>
					</form>
				</section>
			) : null}

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Existing UOMs</h2>
				{loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
				{!loading && uoms.length === 0 ? (
					<p className="text-sm text-slate-500">No units of measure yet. Create SPOOL and FT to continue the walkthrough.</p>
				) : null}
				{uoms.map((uom) => (
					<div key={uom.id} className="rounded-xl border border-slate-200 bg-white p-4">
						<p className="font-semibold">
							{uom.code} · {uom.label}
						</p>
						<p className="text-sm text-slate-600">
							{uom.dimensionKey} · factor {uom.factorToReference}
						</p>
					</div>
				))}
			</section>
		</div>
	);
}
