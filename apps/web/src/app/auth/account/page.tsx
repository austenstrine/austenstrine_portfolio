'use client';

import { useState, type FormEvent } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { ErrorText } from '../../../components/auth/ErrorText';
import { FormField } from '../../../components/auth/FormField';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { AuthApiError, setPassword } from '../../../lib/auth-api';
import { useSession } from '../../../lib/useSession';

function AccountForm() {
	const { user, loading, refresh } = useSession();
	const [currentPassword, setCurrentPassword] = useState('');
	const [password, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const hasPassword = Boolean(user?.hasPassword);

	let submitLabel = 'Add password';
	if(submitting && hasPassword) {
		submitLabel = 'Updating…';
	}
	else if(submitting) {
		submitLabel = 'Adding password…';
	}
	else if(hasPassword) {
		submitLabel = 'Update password';
	}

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSuccess(null);

		if(password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		setSubmitting(true);

		try {
			const result = await setPassword(
				password,
				hasPassword ? currentPassword : undefined,
			);
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			setSuccess(result.message);
			await refresh();
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

	if(loading || !user) {
		return (
			<p className="text-sm text-slate-500">
				Loading account…
			</p>
		);
	}

	return (
		<AuthCard
			title="Account"
			subtitle={
				hasPassword
					? 'Update the password you use with email sign-in.'
					: 'You signed in with Google. Add a password if you also want to sign in with email.'
			}
			footer={
				<p>
					<a
						className="
							font-semibold
							text-sky
							hover:underline
						"
						href="/place-et-marque"
					>
						Back to Place et Marque
					</a>
				</p>
			}
		>
			<p
				className="
					mb-4
					text-sm
					text-slate-600
				"
			>
				Signed in as
				{' '}
				<span className="font-semibold text-ink">
					{user.email}
				</span>
			</p>
			<form
				className="
					flex
					flex-col
					gap-4
				"
				onSubmit={onSubmit}
			>
				{hasPassword
					? (
						<FormField
							label="Current password"
							type="password"
							value={currentPassword}
							onChange={setCurrentPassword}
							autoComplete="current-password"
						/>
					)
					: null
				}
				<FormField
					label={
						hasPassword
							? 'New password'
							: 'Password'
					}
					type="password"
					value={password}
					onChange={setNewPassword}
					autoComplete="new-password"
					placeholder="At least 10 characters"
				/>
				<FormField
					label={
						hasPassword
							? 'Confirm new password'
							: 'Confirm password'
					}
					type="password"
					value={confirmPassword}
					onChange={setConfirmPassword}
					autoComplete="new-password"
				/>

				<ErrorText
					message={error}
				/>
				{success
					? (
						<p
							className="
								rounded-lg
								border
								border-emerald-200
								bg-emerald-50
								px-3
								py-2
								text-sm
								text-emerald-800
							"
							role="status"
						>
							{success}
						</p>
					)
					: null
				}

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
					{submitLabel}
				</button>
			</form>
		</AuthCard>
	);
}

export default function AccountPage() {
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
			<RequireAccess
				reasonKey="account"
			>
				<AccountForm />
			</RequireAccess>
		</main>
	);
}
