'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '../../../../components/auth/AuthCard';
import { ErrorText } from '../../../../components/auth/ErrorText';
import { FormField } from '../../../../components/auth/FormField';
import { AuthApiError, verifyLoginOtp } from '../../../../lib/auth-api';
import {
	AUTH_NEXT_COOKIE,
	consumeStashedNext,
	readCookie,
	resolvePostAuthDestination,
	safeNextPath,
} from '../../../../lib/accessGate';
import {
	finishSignedInNavigation,
	useSession,
} from '../../../../lib/useSession';

function VerifyLoginForm() {
	const searchParams = useSearchParams();
	const { adoptSignedIn } = useSession();
	const pendingToken = searchParams.get('pendingToken');
	const nextFromQuery = searchParams.get('next');
	const nextPath = safeNextPath(
		nextFromQuery ?? readCookie(AUTH_NEXT_COOKIE),
	);

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
			const session = await verifyLoginOtp(pendingToken, code);
			const destination = await resolvePostAuthDestination(
				nextFromQuery ? nextPath : consumeStashedNext(nextPath),
			);
			// Hard remount: soft push left guest SSR seed on SessionProvider (PEM-514).
			finishSignedInNavigation(adoptSignedIn, session.user, destination);
		}
		catch(submitError) {
			setError(
				submitError instanceof AuthApiError
					? submitError.message
					: 'Something went wrong. Please try again.',
			);
			setSubmitting(false);
		}
	};

	return (
		<AuthCard
			title="Enter your code"
			subtitle="We sent a 6-digit code to your email to confirm this sign-in."
		>
			<form
				className="
					flex
					flex-col
					gap-4
				"
				onSubmit={onSubmit}
			>
				<FormField
					label="Verification code"
					value={code}
					onChange={setCode}
					autoComplete="one-time-code"
					inputMode="numeric"
					maxLength={6}
					placeholder="000000"
				/>

				<ErrorText
					message={error}
				/>

				<button
					className="
						self-end
						mt-2
						rounded-full
						bg-sky
						px-4
						py-2.5
						text-sm
						font-semibold
						text-white
						transition
						hover:bg-sky/90
						disabled:cursor-not-allowed
						disabled:opacity-60
					"
					type="submit"
					disabled={submitting || !pendingToken}
				>
					{submitting
						? 'Verifying…'
						: 'Verify and sign in'
					}
				</button>
			</form>
		</AuthCard>
	);
}

export default function VerifyLoginPage() {
	return (
		<div
			className="
				flex
				min-h-[min(70vh,40rem)]
				items-center
				justify-center
				py-8
				md:py-12
			"
		>
			<Suspense fallback={null}>
				<VerifyLoginForm />
			</Suspense>
		</div>
	);
}
