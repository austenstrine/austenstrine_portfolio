'use client';

import { useState, type FormEvent } from 'react';
import { ErrorText } from '../../../../components/auth/ErrorText';
import { FormField } from '../../../../components/auth/FormField';
import { BackLink } from '../../../../components/BackLink';
import { AuthApiError, setPassword } from '../../../../lib/auth-api';
import { useSession } from '../../../../lib/useSession';

export default function AccountPasswordPage() {
	const { user, refresh } = useSession();
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

	if(!user) {
		return null;
	}

	return (
		<div
			className="
				mx-auto
				w-full
				max-w-xl
			"
		>
			<div className="mb-6">
				<BackLink href="/auth/account">
					Account
				</BackLink>
			</div>

			<h1
				className="
					text-2xl
					font-semibold
					text-ink
				"
			>
				Password
			</h1>

			<form
				className="
					mt-8
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

				<ErrorText message={error} />
				{success
					? (
						<p
							className="text-sm text-slate-600"
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
						self-end
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
					disabled={submitting}
				>
					{submitLabel}
				</button>
			</form>
		</div>
	);
}
