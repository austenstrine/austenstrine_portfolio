'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CrmShell } from '../../components/layout/CrmShell';
import { AuthApiError } from '../../lib/auth-api';
import { applyUomMerge } from '../../lib/crm-api';

function UomMergeContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token')?.trim() ?? '';
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(Boolean(token));

	useEffect(() => {
		if(!token) {
			setLoading(false);
			setError(null);
			setMessage(null);
			return;
		}

		setLoading(true);
		setError(null);
		setMessage(null);
		applyUomMerge(token)
			.then((result) => {
				setMessage(result.message);
			})
			.catch((loadError) => {
				setError(
					loadError instanceof AuthApiError
						? loadError.message
						: 'Could not apply this merge decision.',
				);
			})
			.finally(() => setLoading(false));
	}, [token]);

	return (
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
				UOM approvals
			</h1>
			<p
				className="
					mt-3
					text-sm
					text-mist/75
				"
			>
				Confirm or skip cross-vendor unit merges from the automerge email links.
			</p>

			{!token
				? (
						<p
							className="
								mt-8
								rounded-xl
								border
								border-line
								bg-panel/70
								px-5
								py-4
								text-sm
								text-mist/70
							"
						>
							Open a merge link from email to apply a decision. Global units live on{' '}
							<Link
								href="/uoms"
								className="
									text-glow
									underline-offset-2
									hover:underline
								"
							>
								Units of measure
							</Link>
							.
						</p>
					)
				: null
			}

			{loading
				? (
						<p
							className="
								mt-8
								text-sm
								text-mist/60
							"
						>
							Applying decision…
						</p>
					)
				: null
			}

			{message
				? (
						<p
							className="
								mt-8
								rounded-xl
								border
								border-glow/35
								bg-glow/10
								px-5
								py-4
								text-sm
								text-glow
							"
							role="status"
						>
							{message}
						</p>
					)
				: null
			}

			{error
				? (
						<p
							className="
								mt-8
								rounded-xl
								border
								border-warn/40
								bg-warn/10
								px-5
								py-4
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

			{token && !loading
				? (
						<p className="mt-6 text-sm">
							<Link
								href="/uoms"
								className="
									text-glow
									underline-offset-2
									hover:underline
								"
							>
								Back to units of measure
							</Link>
						</p>
					)
				: null
			}
		</div>
	);
}

export default function UomMergesPage() {
	return (
		<CrmShell>
			<Suspense
				fallback={
					<p className="text-sm text-mist/60">
						Loading…
					</p>
				}
			>
				<UomMergeContent />
			</Suspense>
		</CrmShell>
	);
}
