"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { GoogleButton } from '../../../components/auth/GoogleButton';
import { AuthApiError, loginUser } from '../../../lib/auth-api';

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const googleError = searchParams.get('error') === 'google';

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(
		googleError ? 'Google sign-in failed. Please try again.' : null,
	);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			const { pendingToken } = await loginUser(email, password);
			router.push(`/auth/verify?pendingToken=${encodeURIComponent(pendingToken)}`);
		} catch (submitError) {
			setError(
				submitError instanceof AuthApiError
					? submitError.message
					: 'Something went wrong. Please try again.',
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<AuthCard
			title="Sign in"
			subtitle="Every sign-in is confirmed with a one-time code sent to your email."
			footer={
				<p>
					Need an account?{' '}
					<a href="/auth/register" className="font-semibold text-sky hover:underline">
						Create one
					</a>
				</p>
			}
		>
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<FormField
					label="Email address"
					type="email"
					value={email}
					onChange={setEmail}
					autoComplete="email"
					placeholder="you@example.com"
				/>
				<FormField
					label="Password"
					type="password"
					value={password}
					onChange={setPassword}
					autoComplete="current-password"
				/>

				<ErrorText message={error} />

				<button
					type="submit"
					disabled={submitting}
					className="
						mt-2
						rounded-full
						bg-ink
						px-4
						py-2.5
						text-sm
						font-semibold
						text-white
						transition
						hover:bg-sky
						disabled:cursor-not-allowed
						disabled:opacity-60
					"
				>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>

				<div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
					<span className="h-px flex-1 bg-slate-200" />
					or
					<span className="h-px flex-1 bg-slate-200" />
				</div>

				<GoogleButton />
			</form>
		</AuthCard>
	);
}

export default function LoginPage() {
	return (
		<main
			className="
				flex
				min-h-screen
				items-center
				justify-center
				bg-frost
				px-6
				py-16
			"
		>
			<Suspense fallback={null}>
				<LoginForm />
			</Suspense>
		</main>
	);
}
