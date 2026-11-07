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
				Unit merges
			</h1>

			{!token
				? (
						<p
							className="
								mt-8
								text-sm
								text-mist/60
							"
						>
							No merge open.{' '}
							<Link
								href="/uoms"
								className="
									text-glow
									underline-offset-2
									hover:underline
								"
							>
								Units
							</Link>
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
							Applying…
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
						<p
							className="
								mt-6
								text-right
								text-sm
							"
						>
							<Link
								href="/uoms"
								className="
									text-glow
									underline-offset-2
									hover:underline
								"
							>
								Units
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
