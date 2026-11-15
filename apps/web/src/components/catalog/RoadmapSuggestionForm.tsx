'use client';

import { FormEvent, useState } from 'react';
import { FormField } from '../auth/FormField';
import { ErrorText } from '../auth/ErrorText';
import { PILL_CTA_MOTION_CLASS } from './pillCta';
import {
	RoadmapApiError,
	submitRoadmapSuggestion,
} from '../../lib/roadmap-api';
import { useSession } from '../../lib/useSession';

function suggestionErrorMessage(error: unknown) {
	if(error instanceof RoadmapApiError && error.status === 429) {
		return 'Too many suggestions — wait a minute and try again.';
	}
	const raw = error instanceof Error ? error.message.trim() : '';
	if(
		!raw
		|| /failed to fetch|networkerror|load failed|aborterror|timeout/i.test(raw)
	) {
		return 'Could not send — try again in a minute.';
	}
	return raw;
}

export function RoadmapSuggestionForm() {
	const { user } = useSession();
	const [body, setBody] = useState('');
	const [name, setName] = useState('');
	const [email, setEmail] = useState(user?.email ?? '');
	const [website, setWebsite] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		setSent(false);
		try {
			await submitRoadmapSuggestion({
				body: body.trim(),
				name: name.trim() || undefined,
				email: email.trim() || undefined,
				website: website.trim() || undefined,
			});
			setSent(true);
			setBody('');
			setName('');
			if(!user?.email) {
				setEmail('');
			}
			setWebsite('');
		}
		catch(submitError) {
			setError(suggestionErrorMessage(submitError));
		}
		finally {
			setBusy(false);
		}
	};

	return (
		<form
			className="
				relative
				flex
				flex-col
				gap-4
			"
			onSubmit={onSubmit}
			noValidate
		>
			<label className="block">
				<span
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.1em]
						text-slate-500
					"
				>
					Suggestion
				</span>
				<textarea
					className="
						mt-2
						min-h-[7.5rem]
						w-full
						resize-y
						rounded-lg
						border
						border-slate-300
						px-3
						py-2
						text-sm
						text-ink
						transition
						focus:border-sky
						focus:outline-none
						focus:ring-2
						focus:ring-sky/30
					"
					value={body}
					onChange={(event) => setBody(event.target.value)}
					required
					minLength={8}
					maxLength={2000}
					placeholder="What should Place et Marque improve next?"
				/>
			</label>

			<div
				className="
					grid
					gap-4
					sm:grid-cols-2
				"
			>
				<FormField
					label="Name (optional)"
					value={name}
					onChange={setName}
					required={false}
					maxLength={120}
					autoComplete="name"
				/>
				<FormField
					label="Email (optional)"
					type="email"
					value={email}
					onChange={setEmail}
					required={false}
					maxLength={254}
					autoComplete="email"
					inputMode="email"
				/>
			</div>

			{/* Honeypot — hidden from people, not from naive bots */}
			<div
				aria-hidden="true"
				className="
					absolute
					-left-[9999px]
					h-0
					w-0
					overflow-hidden
				"
			>
				<label>
					Website
					<input
						tabIndex={-1}
						autoComplete="off"
						value={website}
						onChange={(event) => setWebsite(event.target.value)}
					/>
				</label>
			</div>

			<ErrorText message={error} />

			{sent
				? (
						<p
							className="
								text-sm
								font-medium
								text-asgreen
							"
							role="status"
						>
							Thanks — suggestion received.
						</p>
					)
				: null
			}

			<div
				className="
					flex
					justify-end
				"
			>
				<button
					className={`
						inline-flex
						items-center
						justify-center
						rounded-full
						bg-sky
						px-5
						py-2.5
						text-sm
						font-semibold
						text-white
						transition
						hover:bg-sky/90
						disabled:cursor-not-allowed
						disabled:opacity-60
						${PILL_CTA_MOTION_CLASS}
					`}
					type="submit"
					disabled={busy || body.trim().length < 8}
				>
					{busy
						? 'Sending…'
						: 'Send suggestion'
					}
				</button>
			</div>
		</form>
	);
}
