'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
	acceptVendorInvite,
	peekVendorInvite,
	type VendorInvitePeek,
} from '../../../../lib/catalog-api';
import {
	ACCESS_REASONS,
	buildLoginUrl,
	buildRegisterUrl,
	safeNextPath,
} from '../../../../lib/accessGate';
import { useSession } from '../../../../lib/useSession';

function AcceptInviteContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get('token')?.trim() ?? '';
	const nextAfter = safeNextPath(searchParams.get('next'), '');
	const { user, loading: sessionLoading } = useSession();

	const [peek, setPeek] = useState<VendorInvitePeek | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);

	useEffect(() => {
		if(!token) {
			setError('This invite link is missing a token.');
			setLoading(false);
			return;
		}

		setLoading(true);
		peekVendorInvite(token)
			.then(setPeek)
			.catch((loadError) => {
				setPeek(null);
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load this invite.',
				);
			})
			.finally(() => setLoading(false));
	}, [token]);

	const acceptPath = token
		? `/shop/invites/accept?token=${encodeURIComponent(token)}`
		: '/shop/invites/accept';

	const onAccept = async () => {
		if(!token) {
			return;
		}
		setAccepting(true);
		setError(null);
		try {
			const result = await acceptVendorInvite(token);
			router.push(
				nextAfter || `/shop/vendors/${result.vendorId}`,
			);
		}
		catch(acceptError) {
			setError(
				acceptError instanceof Error
					? acceptError.message
					: 'Could not accept this invite.',
			);
		}
		finally {
			setAccepting(false);
		}
	};

	return (
		<div
			className="
				mx-auto
				flex
				max-w-lg
				flex-col
				gap-6
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
					Vendor invite
				</p>
				<h1
					className="
						mt-2
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Join an organization
				</h1>
			</div>

			{loading || sessionLoading
				? (
						<p className="text-sm text-slate-500">
							Loading invite…
						</p>
					)
				: null}

			{error
				? (
						<p className="text-sm text-red-700">
							{error}
						</p>
					)
				: null}

			{peek && !sessionLoading
				? (
						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<p className="text-sm text-slate-600">
								You&apos;ve been invited to join
							</p>
							<p className="mt-1 text-xl font-semibold text-ink">
								{peek.vendorName}
							</p>
							<p className="mt-1 text-sm text-slate-600">
								Role: {peek.role} · Invited email: {peek.email}
							</p>
							<p className="mt-1 text-xs text-slate-500">
								Expires {new Date(peek.expiresAt).toLocaleString()}
							</p>

							{!user
								? (
										<div className="mt-5 flex flex-col gap-3">
											<p className="text-sm text-slate-700">
												{ACCESS_REASONS.invite}
											</p>
											<div className="flex flex-wrap gap-3">
												<a
													className="
														rounded-full
														bg-ink
														px-4
														py-2.5
														text-sm
														font-semibold
														text-white
														hover:bg-sky
													"
													href={buildLoginUrl({
														next: acceptPath,
														reason: ACCESS_REASONS.invite,
													})}
												>
													Sign in
												</a>
												<a
													className="
														rounded-full
														border
														border-slate-300
														px-4
														py-2.5
														text-sm
														font-semibold
														text-ink
														hover:border-sky
														hover:text-sky
													"
													href={buildRegisterUrl({
														next: acceptPath,
														reason: ACCESS_REASONS.invite,
													})}
												>
													Create account
												</a>
											</div>
										</div>
									)
								: (
										<div className="mt-5 flex flex-col gap-3">
											{user.email.toLowerCase() !== peek.email.toLowerCase()
												? (
														<p className="text-sm text-amber-800">
															You&apos;re signed in as {user.email}, but this
															invite was sent to {peek.email}. Switch accounts
															to accept it.
														</p>
													)
												: (
														<button
															className="
																self-start
																rounded-full
																bg-ink
																px-4
																py-2.5
																text-sm
																font-semibold
																text-white
																hover:bg-sky
																disabled:opacity-60
															"
															type="button"
															disabled={accepting}
															onClick={() => void onAccept()}
														>
															{accepting ? 'Joining…' : 'Accept invite'}
														</button>
													)}
										</div>
									)}
						</section>
					)
				: null}
		</div>
	);
}

export default function AcceptInvitePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<AcceptInviteContent />
		</Suspense>
	);
}
