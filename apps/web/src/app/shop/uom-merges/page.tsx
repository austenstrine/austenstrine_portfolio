'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { applyUomMerge } from '../../../lib/catalog-api';

function UomMergeContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token')?.trim() ?? '';
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if(!token) {
			setError('This merge link is missing a token.');
			setLoading(false);
			return;
		}

		applyUomMerge(token)
			.then((result) => {
				setMessage(result.message);
			})
			.catch((loadError) => {
				setError(
					loadError instanceof Error
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
				flex
				max-w-lg
				flex-col
				gap-4
			"
		>
			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				UOM merge decision
			</h1>
			{loading
				? (
						<p className="text-sm text-slate-500">
							Applying…
						</p>
					)
				: null
			}
			{message
				? (
						<p
							className="
								rounded-xl
								border
								border-emerald-200
								bg-emerald-50
								p-4
								text-sm
								text-emerald-900
							"
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
								rounded-xl
								border
								border-red-200
								bg-red-50
								p-4
								text-sm
								text-red-800
							"
						>
							{error}
						</p>
					)
				: null
			}
			<a
				className="
					text-sm
					font-semibold
					text-sky
					hover:underline
				"
				href="/shop/uoms"
			>
				Back to units of measure
			</a>
		</div>
	);
}

export default function UomMergePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<UomMergeContent />
		</Suspense>
	);
}
