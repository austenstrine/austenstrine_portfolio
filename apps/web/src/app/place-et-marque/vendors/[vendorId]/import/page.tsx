'use client';

import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
	catalogImportTemplateUrl,
	commitCatalogImport,
	getCatalogImportJob,
	getMyVendor,
	validateCatalogImport,
	type CatalogImportJob,
	type CatalogImportValidation,
	type VendorDetail,
} from '../../../../../lib/catalog-api';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { TermHint } from '../../../../../components/catalog/TermHint';
import { useSession } from '../../../../../lib/useSession';

function VendorImportPageContent() {
	const params = useParams<{ vendorId: string }>();
	const vendorId = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [vendor, setVendor] = useState<VendorDetail | null>(null);
	const [csv, setCsv] = useState('');
	const [validation, setValidation] = useState<CatalogImportValidation | null>(null);
	const [job, setJob] = useState<CatalogImportJob | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if(!user || !vendorId) {
			return;
		}

		getMyVendor(vendorId)
			.then(setVendor)
			.catch((loadError) => {
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load vendor.',
				);
			});
	}, [user, vendorId]);

	useEffect(() => {
		if(!job || !vendorId) {
			return;
		}
		if(job.status === 'COMPLETED' || job.status === 'FAILED') {
			return;
		}

		const timer = window.setInterval(() => {
			getCatalogImportJob(vendorId, job.id)
				.then(setJob)
				.catch(() => undefined);
		}, 1200);

		return () => window.clearInterval(timer);
	}, [job, vendorId]);

	async function onFile(file: File | null) {
		if(!file) {
			return;
		}
		const text = await file.text();
		setCsv(text);
		setValidation(null);
		setJob(null);
		setError(null);
	}

	async function onValidate() {
		if(!vendorId || !csv.trim()) {
			setError('Paste or upload a CSV first.');
			return;
		}

		setBusy(true);
		setError(null);
		setJob(null);
		try {
			const result = await validateCatalogImport(vendorId, csv);
			setValidation(result);
		}
		catch(validateError) {
			setValidation(null);
			setError(
				validateError instanceof Error
					? validateError.message
					: 'Validation failed.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	async function onCommit() {
		if(!vendorId || !csv.trim() || !validation?.ok) {
			return;
		}

		setBusy(true);
		setError(null);
		try {
			const started = await commitCatalogImport(vendorId, csv);
			const status = await getCatalogImportJob(vendorId, started.jobId);
			setJob(status);
		}
		catch(commitError) {
			setError(
				commitError instanceof Error
					? commitError.message
					: 'Commit failed.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<a
				className="
					text-sm
					font-semibold
					text-sky
					hover:underline
				"
				href={`/place-et-marque/vendors/${vendorId}`}
			>
				← Back to vendor
			</a>

			<div>
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-wide
						text-slate-500
					"
				>
					Bulk import
				</p>
				<h1
					className="
						mt-1
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					{vendor
						? `${vendor.name} catalog CSV`
						: 'Catalog CSV'
					}
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-sm
						text-slate-600
					"
				>
					Upload a CSV (or paste sheet export) to add and update products by
					product_slug and offerings by sku +
					{' '}
					<span
						className="
							inline-flex
							items-center
							gap-1
						"
					>
						offering_key
						<TermHint
							termId="offering-key"
						/>
					</span>
					. Nested pack/piece rows
					use parent_offering_key and child_qty_per_parent. Prefer validating here
					before commit; servers can call the same endpoints with a vendor app
					password.
				</p>
			</div>

			{sessionLoading
				? (
					<p className="text-sm text-slate-500">
						Checking session…
					</p>
				)
				: null
			}

			{error
				? (
					<p className="text-sm text-red-700">
						{error}
					</p>
				)
				: null
			}

			{user
				? (
					<>
						<section
							className="
								flex
								flex-wrap
								items-center
								gap-3
							"
						>
							<a
								className="
									rounded-full
									border
									border-slate-300
									px-4
									py-2
									text-sm
									font-semibold
									text-slate-700
									hover:border-sky
									hover:text-sky
								"
								href={catalogImportTemplateUrl()}
							>
								Download template + sample
							</a>
							<a
								className="
									text-sm
									font-semibold
									text-sky
									hover:underline
								"
								href={`/place-et-marque/vendors/${vendorId}#app-passwords`}
							>
								Manage app passwords
							</a>
						</section>

						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<label
								className="
									block
									text-sm
									font-semibold
								"
							>
								Upload CSV
								<input
									className="
										mt-2
										block
										w-full
										text-sm
									"
									type="file"
									accept=".csv,text/csv,text/tab-separated-values,.tsv"
									onChange={(event) =>
										void onFile(event.target.files?.[0] ?? null)
									}
								/>
							</label>

							<label
								className="
									mt-4
									block
									text-sm
									font-semibold
								"
							>
								Or paste CSV / TSV
								<textarea
									className="
										mt-2
										min-h-48
										w-full
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
										font-mono
										text-xs
									"
									value={csv}
									onChange={(event) => {
										setCsv(event.target.value);
										setValidation(null);
										setJob(null);
									}}
									spellCheck={false}
								/>
							</label>

							<div
								className="
									mt-4
									flex
									flex-wrap
									gap-3
								"
							>
								<button
									className="
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
									type="button"
									disabled={busy || !csv.trim()}
									onClick={() => void onValidate()}
								>
									Validate format
								</button>
								<button
									className="
										rounded-full
										border
										border-slate-300
										px-4
										py-2.5
										text-sm
										font-semibold
										text-slate-700
										hover:border-sky
										hover:text-sky
										disabled:opacity-60
									"
									type="button"
									disabled={busy || !validation?.ok}
									onClick={() => void onCommit()}
								>
									Commit import
								</button>
							</div>
						</section>

						{validation
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
										Validation
									</h2>
									<p
										className="
											mt-2
											text-sm
											text-slate-600
										"
									>
										Delimiter: {validation.delimiter === '\t'
											? 'TSV'
											: 'CSV'
										} ·{' '}
										{validation.rowCount} rows ·{' '}
										{validation.createProductCount} products create /{' '}
										{validation.updateProductCount} update ·{' '}
										{validation.createOfferingCount} offerings create /{' '}
										{validation.updateOfferingCount} update
									</p>
									{validation.ok
										? (
											<p
												className="
													mt-2
													text-sm
													font-semibold
													text-emerald-700
												"
											>
												Ready to commit.
											</p>
										)
										: (
											<p
												className="
													mt-2
													text-sm
													font-semibold
													text-red-700
												"
											>
												{validation.blockingErrorCount} blocking issue
												{validation.blockingErrorCount === 1
													? ''
													: 's'
												} —
												fix these before commit.
											</p>
										)
									}
									{validation.errors.length > 0
										? (
											<ul
												className="
													mt-4
													flex
													max-h-80
													flex-col
													gap-2
													overflow-auto
													text-sm
												"
											>
												{validation.errors.map((row, index) => (
													<li
														className={
															row.blocking
																? 'text-red-700'
																: 'text-amber-800'
														}
														key={`${row.lineNumber}-${index}`}
													>
														Line {row.lineNumber}
														{row.column
															? ` · ${row.column}`
															: ''
														}
														: {row.message}
													</li>
												))}
											</ul>
										)
										: null
									}
								</section>
							)
							: null
						}

						{job
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
										Import job
									</h2>
									<p
										className="
											mt-2
											text-sm
											text-slate-600
										"
									>
										Status: {job.status} · created {job.createdCount} · updated{' '}
										{job.updatedCount} · errors {job.errorCount}
									</p>
									{Array.isArray(job.errors) && job.errors.length > 0
										? (
											<ul
												className="
													mt-4
													flex
													flex-col
													gap-2
													text-sm
													text-red-700
												"
											>
												{job.errors.map((row, index) => (
													<li key={`${row.lineNumber}-${index}`}>
														Line {row.lineNumber}: {row.message}
													</li>
												))}
											</ul>
										)
										: null
									}
								</section>
							)
							: null
						}
					</>
				)
				: null
			}
		</div>
	);
}

export default function VendorImportPage() {
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
				reasonKey="import"
			>
				<VendorImportPageContent />
			</RequireAccess>
		</Suspense>
	);
}
