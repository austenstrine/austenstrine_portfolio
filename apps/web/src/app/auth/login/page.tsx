'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { AuthReasonBanner } from '../../../components/auth/AuthReasonBanner';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { GoogleButton } from '../../../components/auth/GoogleButton';
import { AuthApiError, loginUser } from '../../../lib/auth-api';
import {
	buildRegisterUrl,
	safeNextPath,
	stashAuthRedirect,
} from '../../../lib/accessGate';

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const googleError = searchParams.get('error') === 'google';
	const nextPath = safeNextPath(searchParams.get('next'));
	const reason = searchParams.get('reason');

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
			const verifyQuery = new URLSearchParams({
				pendingToken,
				next: nextPath,
			});
			if(reason) {
				verifyQuery.set('reason', reason);
			}
			router.push(`/auth/verify?${verifyQuery.toString()}`);
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
		<AuthCard
			title="Sign in"
			subtitle="Every sign-in is confirmed with a one-time code sent to your email."
			footer={
				<p>
					Need an account?{' '}
					<a
						className="
							font-semibold
							text-sky
							hover:underline
						"
						href={buildRegisterUrl({
							next: nextPath,
							reason: reason ?? undefined,
						})}
					>
						Create one
					</a>
				</p>
			}
		>
			<AuthReasonBanner
				reason={reason}
			/>
			<form
				className="
					flex
					flex-col
					gap-4
				"
				onSubmit={onSubmit}
			>
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

				<div className="-mt-2 text-right">
					<a
						className="
							text-sm
							font-semibold
							text-sky
							hover:underline
						"
						href="/auth/forgot-password"
					>
						Forgot password?
					</a>
				</div>
				<p
					className="
						-mt-1
						text-xs
						text-slate-500
					"
				>
					Used Google and never set a password? You can add one after signing in, or
					{' '}
					<a
						className="
							font-semibold
							text-sky
							hover:underline
						"
						href="/auth/forgot-password"
					>
						create one here.
					</a>
				</p>

				<ErrorText
					message={error}
				/>

				<button
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
					type="submit"
					disabled={submitting}
				>
					{submitting
						? 'Signing in…'
						: 'Sign in'
					}
				</button>

				<div
					className="
						flex
						items-center
						gap-3
						text-xs
						uppercase
						tracking-wide
						text-slate-400
					"
				>
					<span
						className="
							h-px
							flex-1
							bg-slate-200
						"
					/>
					or
					<span
						className="
							h-px
							flex-1
							bg-slate-200
						"
					/>
				</div>

				<GoogleButton
					onBeforeNavigate={() => {
						stashAuthRedirect(nextPath, reason ?? undefined);
					}}
				/>
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
