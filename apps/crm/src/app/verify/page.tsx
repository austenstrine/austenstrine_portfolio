'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthApiError, verifyLoginOtp } from '../../lib/auth-api';

function safeNext(raw: string | null): string {
	if(!raw || !raw.startsWith('/') || raw.startsWith('//')) {
		return '/';
	}
	return raw;
}

function VerifyForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pendingToken = searchParams.get('pendingToken');
	const nextPath = safeNext(searchParams.get('next'));

	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(
		pendingToken ? null : 'This sign-in link is invalid or has expired. Please log in again.',
	);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if(!pendingToken) {
			return;
		}
		setError(null);
		setSubmitting(true);
		try {
			await verifyLoginOtp(pendingToken, code);
			router.push(nextPath);
		}
		catch(submitError) {
			setError(
				submitError instanceof AuthApiError
					? submitError.message
					: 'Something went wrong. Please try again.',
			);
		}
		finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="
				flex
				min-h-screen
				items-center
				justify-center
				px-[var(--gutter)]
				py-12
			"
		>
			<div
				className="
					w-full
					max-w-md
					rounded-2xl
					border
					border-line
					bg-panel/90
					p-8
				"
			>
				<p
					className="
						text-[0.7rem]
						font-semibold
						uppercase
						tracking-[0.18em]
						text-glow/90
					"
				>
					CRM
				</p>
				<h1
					className="
						mt-2
						text-2xl
						font-semibold
						text-white
					"
				>
					Enter your code
				</h1>
				<p
					className="
						mt-2
						text-sm
						text-mist/70
					"
				>
					We sent a 6-digit code to your email to confirm this sign-in.
				</p>

				<form
					className="
						mt-6
						flex
						flex-col
						gap-4
					"
					onSubmit={onSubmit}
				>
					<label className="block text-sm">
						<span className="font-medium text-mist">
							Verification code
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
								font-mono
								tracking-widest
								text-mist
							"
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							required
							value={code}
							onChange={(event) => setCode(event.target.value)}
							placeholder="000000"
						/>
					</label>

					{error
						? (
								<p
									className="
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

					<button
						type="submit"
						disabled={submitting || !pendingToken}
						className="
							rounded-lg
							bg-glow
							px-4
							py-2.5
							text-sm
							font-semibold
							text-rail
							disabled:opacity-60
						"
					>
						{submitting
							? 'Checking…'
							: 'Sign in'
						}
					</button>
				</form>
			</div>
		</div>
	);
}

export default function VerifyPage() {
	return (
		<Suspense
			fallback={
				<p
					className="
						p-8
						text-sm
						text-mist/60
					"
				>
					Loading…
				</p>
			}
		>
			<VerifyForm />
		</Suspense>
	);
}
