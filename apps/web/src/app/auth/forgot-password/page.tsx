"use client";

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { AuthApiError, requestPasswordReset } from '../../../lib/auth-api';

export default function ForgotPasswordPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await requestPasswordReset(email);
			router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
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
				title="Forgot password"
				subtitle="Enter your email and we'll send a one-time code if an account exists."
				footer={
					<p>
						Remembered it?{' '}
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
						{submitting ? 'Sending code…' : 'Send reset code'}
					</button>
				</form>
			</AuthCard>
		</main>
	);
}
