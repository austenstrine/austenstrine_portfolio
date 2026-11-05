'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
	getDemoVendorInfo,
	joinDemoVendor,
	type DemoVendorInfo,
} from '../../../lib/catalog-api';
import {
	ACCESS_REASONS,
	buildLoginUrl,
} from '../../../lib/accessGate';
import { useSession } from '../../../lib/useSession';

export default function JoinDemoPage() {
	const router = useRouter();
	const { user, loading: sessionLoading } = useSession();
	const [info, setInfo] = useState<DemoVendorInfo | null>(null);
	const [infoError, setInfoError] = useState<string | null>(null);
	const [email, setEmail] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [alreadyMemberMessage, setAlreadyMemberMessage] = useState<string | null>(null);

	useEffect(() => {
		getDemoVendorInfo()
			.then(setInfo)
			.catch((loadError) => {
				setInfoError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load the demo vendor.',
				);
			});
	}, []);

	useEffect(() => {
		if(user?.email) {
			setEmail(user.email);
		}
	}, [user?.email]);

	const onJoin = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		setAlreadyMemberMessage(null);
		try {
			const result = await joinDemoVendor(email.trim());
			if(result.alreadyMember) {
				setAlreadyMemberMessage(
					`You're already on ${result.vendorName}. Sign in to open the seller workspace.`,
				);
				return;
			}
			if(!result.acceptPath) {
				throw new Error('Invite was created but no accept link came back.');
			}
			router.push(result.acceptPath);
		}
		catch(joinError) {
			setError(
				joinError instanceof Error
					? joinError.message
					: 'Could not start the demo invite.',
			);
		}
		finally {
			setBusy(false);
		}
	};

	const vendorName = info?.vendorName ?? 'Demo Supply Co.';
	const signInHref = buildLoginUrl({
		next: `/place-et-marque/vendors/${info?.vendorSlug ?? 'demo-supply'}`,
		reason: ACCESS_REASONS.joinDemo,
	});

	return (
		<div
			className="
				mx-auto
				flex
				max-w-2xl
				flex-col
				gap-8
			"
		>
			<div>
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.22em]
						text-sky
					"
				>
					Place et Marque
				</p>
				<h1
					className="
						mt-2
						text-3xl
						font-semibold
						tracking-tight
						md:text-4xl
					"
				>
					Join the seller demo
				</h1>
				<p
					className="
						mt-3
						text-base
						leading-relaxed
						text-slate-700
					"
				>
					{info?.description
						?? 'A live multi-vendor catalog with packs, pieces, search, and Stripe checkout. Join as a seller teammate on the seeded demo vendor.'
					}
				</p>
			</div>

			{infoError
				? (
						<p className="text-sm text-red-700">
							{infoError}
						</p>
					)
				: null
			}

			<section
				className="
					rounded-2xl
					border
					border-slate-200
					bg-white
					p-5
					md:p-6
				"
			>
				<h2
					className="
						text-lg
						font-semibold
						text-ink
					"
				>
					Join {vendorName}
				</h2>
				<p
					className="
						mt-2
						text-sm
						leading-relaxed
						text-slate-600
					"
				>
					Enter the email you want to register with. We create a normal
					organization invite for that address — same path a real vendor would
					use — then you create an account (or sign in) and accept membership.
				</p>

				<form
					className="
						mt-5
						flex
						flex-col
						gap-3
					"
					onSubmit={(event) => void onJoin(event)}
				>
					<label
						className="
							flex
							flex-col
							gap-1.5
							text-sm
							font-medium
							text-ink
						"
					>
						Email
						<input
							className="
								rounded-full
								border
								border-slate-300
								px-4
								py-2.5
								text-sm
								font-normal
								text-ink
								outline-none
								focus:border-sky
								focus:ring-2
								focus:ring-sky/30
							"
							type="email"
							name="email"
							autoComplete="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="you@example.com"
							disabled={busy || sessionLoading}
						/>
					</label>

					{error
						? (
								<p className="text-sm text-red-700">
									{error}
								</p>
							)
						: null
					}

					{alreadyMemberMessage
						? (
								<p className="text-sm text-amber-800">
									{alreadyMemberMessage}
								</p>
							)
						: null
					}

					<div
						className="
							mt-1
							flex
							flex-wrap
							gap-3
						"
					>
						<button
							className="
								rounded-full
								bg-sky
								px-5
								py-2.5
								text-sm
								font-semibold
								text-white
								hover:bg-sky/90
								disabled:opacity-60
							"
							type="submit"
							disabled={busy || sessionLoading || !email.trim()}
						>
							{busy
								? 'Sending invite…'
								: 'Join demo'
							}
						</button>
						<a
							className="
								rounded-full
								border
								border-slate-300
								px-5
								py-2.5
								text-sm
								font-semibold
								text-ink
								hover:border-sky
								hover:text-sky
							"
							href={signInHref}
						>
							Sign in
						</a>
					</div>
				</form>
			</section>

			<p
				className="
					text-sm
					text-slate-600
				"
			>
				Prefer shopping first?
				{' '}
				<a
					className="
						font-semibold
						text-sky
						hover:underline
					"
					href="/place-et-marque"
				>
					Browse the catalog
				</a>
				{' '}
				without an account.
			</p>
		</div>
	);
}
