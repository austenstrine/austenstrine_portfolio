"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { AuthApiError, verifyEmail } from '../../../lib/auth-api';

function VerifyEmailForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState(searchParams.get('email') ?? '');
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await verifyEmail(email, code);
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
			title="Confirm your email"
			subtitle="We sent a 6-digit code to your email address. Enter it below to finish creating your account."
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
					{submitting ? 'Verifying…' : 'Verify email'}
				</button>
			</form>
		</AuthCard>
	);
}

export default function VerifyEmailPage() {
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
				<VerifyEmailForm />
			</Suspense>
		</main>
	);
}
