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
	onError,
}: {
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
				return_url: `${window.location.origin}/shop/orders?paid=1`,
			},
			redirect: 'if_required',
		});

		if(result.error) {
			onError(result.error.message ?? 'Payment failed.');
			setSubmitting(false);
			return;
		}

		router.push('/shop/orders?paid=1');
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
				type="submit"
				disabled={!stripe || submitting}
			>
				{submitting
					? 'Processing…'
					: 'Pay now'
				}
			</button>
		</form>
	);
}

function CheckoutContent() {
	const { user, loading: sessionLoading } = useSession();
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

	async function onStartPayment() {
		if(!preview) {
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
				throw new Error('Stripe did not return a client secret.');
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

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<div>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Checkout
				</h1>
				<p
					className="
						mt-2
						text-sm
						text-slate-600
					"
				>
					One payment covers every shipment group in your cart.
				</p>
			</div>

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

			{user && preview
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

						{preview.groups.map((group) => (
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
									{group.vendorName} · {group.shippingProfileName}
								</h2>
								{group.shipsSeparately
									? (
										<p
											className="
												mt-1
												text-xs
												font-semibold
												uppercase
												tracking-wide
												text-amber-800
											"
										>
											Ships separately
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
										Shipping rate
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
						))}

						<div
							className="
								flex
								flex-wrap
								items-center
								justify-between
								gap-3
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
										disabled={busy || preview.groups.length === 0}
										onClick={() => void onStartPayment()}
									>
										{busy
											? 'Reserving…'
											: 'Continue to payment'
										}
									</button>
								)
								: (
									<p className="text-sm text-slate-600">
										Charging {formatMoney(totalCents)}
									</p>
								)
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
