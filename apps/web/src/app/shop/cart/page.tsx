'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import {
	formatMoney,
	getCart,
	removeCartLine,
	upsertCartLine,
	type CartDto,
} from '../../../lib/checkout-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';

function CartContent() {
	const { user, loading: sessionLoading } = useSession();
	const [cart, setCart] = useState<CartDto | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function refresh() {
		const next = await getCart();
		setCart(next);
	}

	useEffect(() => {
		if(!user) {
			return;
		}
		refresh().catch((loadError) => {
			setError(
				loadError instanceof Error ? loadError.message : 'Could not load cart.',
			);
		});
	}, [user]);

	async function onQty(offeringId: string, quantity: string) {
		setBusy(true);
		setError(null);
		try {
			setCart(await upsertCartLine(offeringId, quantity));
		}
		catch(updateError) {
			setError(
				updateError instanceof Error
					? updateError.message
					: 'Could not update cart.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	async function onRemove(offeringId: string) {
		setBusy(true);
		setError(null);
		try {
			setCart(await removeCartLine(offeringId));
		}
		catch(removeError) {
			setError(
				removeError instanceof Error
					? removeError.message
					: 'Could not remove line.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	const merchandiseCents =
		cart?.lines.reduce((sum, line) => sum + line.lineTotalCents, 0) ?? 0;

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
					Cart
				</h1>
				<p
					className="
						mt-2
						text-sm
						text-slate-600
					"
				>
					Multi-vendor carts checkout as separate shipments when vendors or freight
					profiles require it.
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

			{user && cart
				? (
					<>
						{cart.lines.length === 0
							? (
								<p className="text-sm text-slate-500">
									Your cart is empty.{' '}
									<Link
										className="
											font-semibold
											text-sky
											hover:underline
										"
										href="/shop/search"
									>
										Browse products
									</Link>
								</p>
							)
							: (
								<ul
									className="
										flex
										flex-col
										gap-3
									"
								>
									{cart.lines.map((line) => (
										<li
											className="
												rounded-2xl
												border
												border-slate-200
												bg-white
												p-4
											"
											key={line.id}
										>
											<div
												className="
													flex
													flex-wrap
													items-start
													justify-between
													gap-3
												"
											>
												<div>
													<p className="font-semibold">
														{line.title}
													</p>
													<p className="text-sm text-slate-600">
														{line.vendor.name} · {line.sku} · {line.uom}
													</p>
													<p className="text-sm text-slate-500">
														{formatMoney(line.unitPriceCents, line.currency)} each ·{' '}
														{line.availableQty} available
													</p>
												</div>
												<p className="font-semibold">
													{formatMoney(line.lineTotalCents, line.currency)}
												</p>
											</div>
											<div
												className="
													mt-3
													flex
													flex-wrap
													items-center
													gap-3
												"
											>
												<label className="text-sm">
													Qty
													<input
														className="
															ml-2
															w-24
															rounded-lg
															border
															border-slate-300
															px-2
															py-1
														"
														disabled={busy}
														defaultValue={line.quantity}
														onBlur={(event) =>
															void onQty(line.offeringId, event.target.value)
														}
													/>
												</label>
												<button
													className="
														text-sm
														font-semibold
														text-red-700
														hover:underline
														disabled:opacity-60
													"
													type="button"
													disabled={busy}
													onClick={() => void onRemove(line.offeringId)}
												>
													Remove
												</button>
											</div>
										</li>
									))}
								</ul>
							)
						}

						{cart.lines.length > 0
							? (
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
										Merchandise {formatMoney(merchandiseCents)}
									</p>
									<Link
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
										href="/shop/checkout"
									>
										Checkout
									</Link>
								</div>
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

export default function CartPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess reasonKey="cart">
				<CartContent />
			</RequireAccess>
		</Suspense>
	);
}
