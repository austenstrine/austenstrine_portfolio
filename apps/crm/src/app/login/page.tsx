'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthApiError, loginUser } from '../../lib/auth-api';

function safeNext(raw: string | null): string {
	if(!raw || !raw.startsWith('/') || raw.startsWith('//')) {
		return '/';
	}
	return raw;
}

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextPath = safeNext(searchParams.get('next'));

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const { pendingToken } = await loginUser(email, password);
			const query = new URLSearchParams({
				pendingToken,
				next: nextPath,
			});
			router.push(`/verify?${query.toString()}`);
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
					shadow-xl
					shadow-black/30
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
					Sign in
				</h1>
				<p
					className="
						mt-2
						text-sm
						text-mist/70
					"
				>
					Admin sign-in uses the same account as the platform. A one-time code is emailed
					each time.
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
							Email address
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
								text-mist
							"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</label>
					<label className="block text-sm">
						<span className="font-medium text-mist">
							Password
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
								text-mist
							"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
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
						disabled={submitting}
						className="
							mt-1
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
							? 'Sending code…'
							: 'Continue'
						}
					</button>
				</form>
			</div>
		</div>
	);
}

export default function LoginPage() {
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
			<LoginForm />
		</Suspense>
	);
}
