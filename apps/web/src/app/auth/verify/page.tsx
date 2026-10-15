"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { AuthApiError, verifyLoginOtp } from '../../../lib/auth-api';

function VerifyLoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pendingToken = searchParams.get('pendingToken');

	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(
		pendingToken ? null : 'This sign-in link is invalid or has expired. Please log in again.',
	);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();

		if (!pendingToken) {
			return;
		}

		setError(null);
		setSubmitting(true);

		try {
			await verifyLoginOtp(pendingToken, code);
			router.push('/');
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
			title="Enter your code"
			subtitle="We sent a 6-digit code to your email to confirm this sign-in."
		>
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<FormField
					label="Verification code"
					value={code}
					onChange={setCode}
					autoComplete="one-time-code"
					inputMode="numeric"
					maxLength={6}
					placeholder="000000"
				/>

				<ErrorText message={error} />

				<button
					type="submit"
					disabled={submitting || !pendingToken}
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
					{submitting ? 'Verifying…' : 'Verify and sign in'}
				</button>
			</form>
		</AuthCard>
	);
}

export default function VerifyLoginPage() {
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
				<VerifyLoginForm />
			</Suspense>
		</main>
	);
}
