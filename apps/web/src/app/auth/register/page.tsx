"use client";

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { GoogleButton } from '../../../components/auth/GoogleButton';
import { AuthApiError, registerUser } from '../../../lib/auth-api';

export default function RegisterPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		setSubmitting(true);

		try {
			await registerUser(email, password);
			router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
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
			<AuthCard
				title="Create your account"
				subtitle="Your email doubles as your username, and every sign-in is confirmed with a one-time code."
				footer={
					<p>
						Already have an account?{' '}
						<a href="/auth/login" className="font-semibold text-sky hover:underline">
							Sign in
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
						autoComplete="new-password"
						placeholder="At least 10 characters"
					/>
					<FormField
						label="Confirm password"
						type="password"
						value={confirmPassword}
						onChange={setConfirmPassword}
						autoComplete="new-password"
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
						{submitting ? 'Creating account…' : 'Create account'}
					</button>

					<div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
						<span className="h-px flex-1 bg-slate-200" />
						or
						<span className="h-px flex-1 bg-slate-200" />
					</div>

					<GoogleButton />
				</form>
			</AuthCard>
		</main>
	);
}
