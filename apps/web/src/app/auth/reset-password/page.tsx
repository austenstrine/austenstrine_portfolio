"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { AuthApiError, resetPassword } from '../../../lib/auth-api';

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState(searchParams.get('email') ?? '');
	const [code, setCode] = useState('');
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
			await resetPassword(email, code, password);
			router.push('/auth/login');
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
			title="Reset password"
			subtitle="Enter the code from your email, then choose a new password."
			footer={
				<p>
					Need a new code?{' '}
					<a href="/auth/forgot-password" className="font-semibold text-sky hover:underline">
						Request another
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
				/>
				<FormField
					label="Reset code"
					value={code}
					onChange={setCode}
					autoComplete="one-time-code"
					inputMode="numeric"
					maxLength={6}
					placeholder="000000"
				/>
				<FormField
					label="New password"
					type="password"
					value={password}
					onChange={setPassword}
					autoComplete="new-password"
					placeholder="At least 10 characters"
				/>
				<FormField
					label="Confirm new password"
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
					{submitting ? 'Updating…' : 'Update password'}
				</button>
			</form>
		</AuthCard>
	);
}

export default function ResetPasswordPage() {
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
				<ResetPasswordForm />
			</Suspense>
		</main>
	);
}
