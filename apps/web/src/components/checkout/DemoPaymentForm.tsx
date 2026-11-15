'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { confirmDemoPayment } from '../../lib/checkout-api';
import { LockIcon } from '../icons/LockIcon';

function digitsOnly(value: string): string {
	return value.replace(/\D/g, '');
}

function formatCardNumber(value: string): string {
	const digits = digitsOnly(value).slice(0, 16);
	return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
	const digits = digitsOnly(value).slice(0, 4);
	if(digits.length <= 2) {
		return digits;
	}
	return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function DemoPaymentForm({
	checkoutId,
	amountLabel,
	onError,
}: {
	checkoutId: string;
	amountLabel: string;
	onError: (message: string) => void;
}) {
	const router = useRouter();
	const [cardNumber, setCardNumber] = useState('');
	const [expiry, setExpiry] = useState('');
	const [cvc, setCvc] = useState('');
	const [nameOnCard, setNameOnCard] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function onPay(event: React.FormEvent) {
		event.preventDefault();

		const numberDigits = digitsOnly(cardNumber);
		const expiryDigits = digitsOnly(expiry);
		const cvcDigits = digitsOnly(cvc);

		if(numberDigits.length < 15 || expiryDigits.length < 4 || cvcDigits.length < 3 || nameOnCard.trim().length === 0) {
			onError('Enter card details to continue.');
			return;
		}

		setSubmitting(true);
		onError('');
		try {
			await confirmDemoPayment(checkoutId);
			router.push('/place-et-marque/orders?paid=1');
		}
		catch(payError) {
			onError(
				payError instanceof Error
					? payError.message
					: 'Payment failed.',
			);
			setSubmitting(false);
		}
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
			<label
				className="
					block
					text-sm
				"
			>
				<span className="font-semibold">
					Name on card
				</span>
				<input
					autoComplete="cc-name"
					className="
						mt-1
						w-full
						rounded-lg
						border
						border-slate-300
						px-3
						py-2
					"
					required
					value={nameOnCard}
					onChange={(event) => setNameOnCard(event.target.value)}
				/>
			</label>
			<label
				className="
					block
					text-sm
				"
			>
				<span className="font-semibold">
					Card number
				</span>
				<input
					autoComplete="cc-number"
					className="
						mt-1
						w-full
						rounded-lg
						border
						border-slate-300
						px-3
						py-2
						font-mono
						tracking-wide
					"
					inputMode="numeric"
					placeholder="4242 4242 4242 4242"
					required
					value={cardNumber}
					onChange={(event) =>
						setCardNumber(formatCardNumber(event.target.value))
					}
				/>
			</label>
			<div
				className="
					grid
					gap-3
					sm:grid-cols-2
				"
			>
				<label
					className="
						block
						text-sm
					"
				>
					<span className="font-semibold">
						Expiry
					</span>
					<input
						autoComplete="cc-exp"
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-slate-300
							px-3
							py-2
							font-mono
						"
						inputMode="numeric"
						placeholder="MM/YY"
						required
						value={expiry}
						onChange={(event) =>
							setExpiry(formatExpiry(event.target.value))
						}
					/>
				</label>
				<label
					className="
						block
						text-sm
					"
				>
					<span className="font-semibold">
						CVC
					</span>
					<input
						autoComplete="cc-csc"
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-slate-300
							px-3
							py-2
							font-mono
						"
						inputMode="numeric"
						placeholder="123"
						required
						value={cvc}
						onChange={(event) =>
							setCvc(digitsOnly(event.target.value).slice(0, 4))
						}
					/>
				</label>
			</div>
			<button
				className="
					inline-flex
					items-center
					justify-center
					gap-2
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
					max-sm:h-11
					max-sm:w-11
					max-sm:px-0
					max-lg:mr-14
				"
				type="submit"
				disabled={submitting}
				aria-label={
					submitting
						? 'Working…'
						: `Pay ${amountLabel}`
				}
			>
				<LockIcon className="h-4 w-4 shrink-0" />
				<span
					className="
						max-sm:sr-only
					"
				>
					{submitting
						? 'Working…'
						: `Pay ${amountLabel}`
					}
				</span>
			</button>
		</form>
	);
}
