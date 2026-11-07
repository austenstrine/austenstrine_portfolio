'use client';

import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
	createCheckoutSession,
	formatMoney,
	getCheckoutPreview,
	stripePublishableKeyFallback,
	type CheckoutPreview,
} from '../../../lib/checkout-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';

function PaymentForm({
	amountLabel,
	onError,
}: {
	amountLabel: string;
	onError: (message: string) => void;
}) {
	const stripe = useStripe();
	const elements = useElements();
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);

	async function onPay(event: React.FormEvent) {
		event.preventDefault();
		if(!stripe || !elements) {
			return;
		}

		setSubmitting(true);
		onError('');
		const result = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: `${window.location.origin}/place-et-marque/orders?paid=1`,
			},
			redirect: 'if_required',
		});

		if(result.error) {
			onError(result.error.message ?? 'Payment failed.');
			setSubmitting(false);
			return;
		}

		router.push('/place-et-marque/orders?paid=1');
	}

	return (
		<form
			className="
				mt-4
				flex
				flex-col
				gap-4
			"
			onSubmit={(event) => void onPay(event)}
		>
			<PaymentElement />
			<button
				className="
					self-end
					rounded-full
					bg-sky
					px-4
					py-2.5
					text-sm
					font-semibold
					text-white
					hover:bg-sky/90
					disabled:opacity-60
					max-lg:mr-14
				"
				type="submit"
				disabled={!stripe || submitting}
			>
				{submitting
					? 'Working…'
					: `Pay ${amountLabel}`
				}
			</button>
		</form>
	);
}

function addressReady(address: {
	name: string;
	line1: string;
	city: string;
	region: string;
	postal: string;
}) {
	return (
		address.name.trim().length > 0
		&& address.line1.trim().length > 0
		&& address.city.trim().length > 0
		&& address.region.trim().length > 0
		&& address.postal.trim().length > 0
	);
}

function CheckoutContent() {
	const { user, loading: sessionLoading } = useSession();
	const router = useRouter();
	const [preview, setPreview] = useState<CheckoutPreview | null>(null);
	const [rateByGroup, setRateByGroup] = useState<Record<string, string>>({});
	const [address, setAddress] = useState({
		name: '',
		line1: '',
		line2: '',
		city: '',
		region: '',
		postal: '',
		country: 'US',
	});
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [publishableKey, setPublishableKey] = useState('');
	const [totalCents, setTotalCents] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if(!user) {
			return;
		}
		getCheckoutPreview()
			.then((next) => {
				setPreview(next);
				const defaults: Record<string, string> = {};
				for(const group of next.groups) {
					defaults[group.groupKey] = group.rates[0]?.id ?? '';
				}
				setRateByGroup(defaults);
			})
			.catch((loadError) => {
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load checkout preview.',
				);
			});
	}, [user]);

	const stripePromise = useMemo(() => {
		if(!publishableKey) {
			return null;
		}
		return loadStripe(publishableKey) as Promise<Stripe | null>;
	}, [publishableKey]);

	const shippingCents = useMemo(() => {
		if(!preview) {
			return 0;
		}
		return preview.groups.reduce((sum, group) => {
			const rateId = rateByGroup[group.groupKey];
			const rate = group.rates.find((row) => row.id === rateId);
			return sum + (rate?.amountCents ?? 0);
		}, 0);
	}, [preview, rateByGroup]);

	const vendorGroupCounts = useMemo(() => {
		const counts = new Map<string, number>();
		if(!preview) {
			return counts;
		}
		for(const group of preview.groups) {
			counts.set(group.vendorId, (counts.get(group.vendorId) ?? 0) + 1);
		}
		return counts;
	}, [preview]);

	const ratesReady = useMemo(() => {
		if(!preview || preview.groups.length === 0) {
			return false;
		}
		return preview.groups.every((group) => Boolean(rateByGroup[group.groupKey]));
	}, [preview, rateByGroup]);

	const canContinue = Boolean(
		preview
		&& preview.groups.length > 0
		&& addressReady(address)
		&& ratesReady
		&& !busy,
	);

	async function onStartPayment() {
		if(!preview || preview.groups.length === 0 || !addressReady(address) || !ratesReady) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const session = await createCheckoutSession({
				address,
				shipments: preview.groups.map((group) => ({
					groupKey: group.groupKey,
					rateId: rateByGroup[group.groupKey],
				})),
			});
			if(!session.clientSecret) {
				// CHECKOUT_DEV_BYPASS finalizes to PAID without Stripe.
				router.push('/place-et-marque/orders?paid=1');
				return;
			}
			setClientSecret(session.clientSecret);
			setPublishableKey(
				session.publishableKey || stripePublishableKeyFallback(),
			);
			setTotalCents(session.totalCents);
		}
		catch(sessionError) {
			setError(
				sessionError instanceof Error
					? sessionError.message
					: 'Could not start payment.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	const cartEmpty = Boolean(preview && preview.groups.length === 0);
	const amountLabel = formatMoney(
		totalCents || ((preview?.merchandiseCents ?? 0) + shippingCents),
		preview?.currency,
	);

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				Checkout
			</h1>

			{sessionLoading
				? (
					<p className="text-sm text-slate-500">
						Checking session…
					</p>
				)
				: null
			}

			{error
				? (
					<p className="text-sm text-red-700">
						{error}
					</p>
				)
				: null
			}

			{user && cartEmpty
				? (
					<div
						className="
							rounded-2xl
							border
							border-dashed
							border-slate-300
							bg-white
							px-6
							py-16
							text-center
						"
					>
						<p className="text-xl font-semibold text-ink">
							Your cart is empty
						</p>
						<Link
							className="
								mt-6
								inline-flex
								rounded-full
								bg-sky
								px-5
								py-2.5
								text-sm
								font-semibold
								text-white
								hover:bg-sky/90
							"
							href="/place-et-marque/cart"
						>
							Back to cart
						</Link>
					</div>
				)
				: null
			}

			{user && preview && preview.groups.length > 0
				? (
					<>
						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<h2 className="text-lg font-semibold">
								Ship to
							</h2>
							<div
								className="
									mt-3
									grid
									gap-3
									md:grid-cols-2
								"
							>
								{(
									[
										['name', 'Name'],
										['line1', 'Address'],
										['line2', 'Address 2'],
										['city', 'City'],
										['region', 'State / region'],
										['postal', 'Postal'],
										['country', 'Country'],
									] as const
								).map(([key, label]) => (
									<label
										className="
											block
											text-sm
										"
										key={key}
									>
										<span className="font-semibold">
											{label}
										</span>
										<input
											className="
												mt-1
												w-full
												rounded-lg
												border
												border-slate-300
												px-3
												py-2
											"
											value={address[key]}
											onChange={(event) =>
												setAddress((prev) => ({
													...prev,
													[key]: event.target.value,
												}))
											}
										/>
									</label>
								))}
							</div>
						</section>

						{preview.groups.map((group) => {
							const showProfile =
								(vendorGroupCounts.get(group.vendorId) ?? 0) > 1
								|| group.shipsSeparately;
							return (
								<section
									className="
										rounded-2xl
										border
										border-slate-200
										bg-white
										p-5
									"
									key={group.groupKey}
								>
									<h2 className="text-lg font-semibold">
										{group.vendorName}
									</h2>
									{showProfile && group.shippingProfileName
										? (
											<p
												className="
													mt-1
													text-sm
													text-slate-600
												"
											>
												{group.shippingProfileName}
											</p>
										)
										: null
									}
									<ul
										className="
											mt-3
											flex
											flex-col
											gap-2
											text-sm
										"
									>
										{group.lines.map((line) => (
											<li
												className="
													flex
													justify-between
													gap-3
												"
												key={line.offeringId}
											>
												<span>
													{line.title} × {line.quantity}
												</span>
												<span>
													{formatMoney(line.lineTotalCents, group.currency)}
												</span>
											</li>
										))}
									</ul>
									<label
										className="
											mt-4
											block
											text-sm
										"
									>
										<span className="font-semibold">
											Shipping
										</span>
										<select
											className="
												mt-1
												w-full
												rounded-lg
												border
												border-slate-300
												px-3
												py-2
											"
											value={rateByGroup[group.groupKey] ?? ''}
											onChange={(event) =>
												setRateByGroup((prev) => ({
													...prev,
													[group.groupKey]: event.target.value,
												}))
											}
										>
											{group.rates.map((rate) => (
												<option
													key={rate.id}
													value={rate.id}
												>
													{rate.label} · {formatMoney(rate.amountCents)}
												</option>
											))}
										</select>
									</label>
								</section>
							);
						})}

						<div
							className="
								flex
								flex-wrap
								items-center
								justify-between
								gap-3
								max-lg:pr-14
							"
						>
							<p className="text-lg font-semibold">
								Total{' '}
								{formatMoney(
									(preview.merchandiseCents ?? 0) + shippingCents,
									preview.currency,
								)}
							</p>
							{!clientSecret
								? (
									<button
										className="
											rounded-full
											bg-sky
											px-4
											py-2.5
											text-sm
											font-semibold
											text-white
											hover:bg-sky/90
											disabled:opacity-60
										"
										type="button"
										disabled={!canContinue}
										onClick={() => void onStartPayment()}
									>
										{busy
											? 'Working…'
											: 'Continue to payment'
										}
									</button>
								)
								: null
							}
						</div>

						{clientSecret && stripePromise
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
									<h2 className="text-lg font-semibold">
										Payment
									</h2>
									<Elements
										stripe={stripePromise}
										options={{ clientSecret }}
									>
										<PaymentForm
											amountLabel={amountLabel}
											onError={(message) => setError(message || null)}
										/>
									</Elements>
								</section>
							)
							: null
						}
					</>
				)
				: null
			}
		</div>
	);
}

export default function CheckoutPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess reasonKey="checkout">
				<CheckoutContent />
			</RequireAccess>
		</Suspense>
	);
}
