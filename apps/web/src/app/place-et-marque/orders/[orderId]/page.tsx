'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	cancelBuyerOrder,
	formatMoney,
	formatOrderStatus,
	getBuyerOrder,
	type PlaceEtMarqueOrder,
} from '../../../../lib/checkout-api';
import { useSession } from '../../../../lib/useSession';
import { BackLink } from '../../../../components/BackLink';
import { OrderConfirmActions } from '../../../../components/orders/OrderConfirmActions';
import { OrderMoneySummary } from '../../../../components/orders/OrderMoneySummary';
import { OrderSupportCode } from '../../../../components/orders/OrderSupportCode';
import { formatShipTo } from '../../../../components/orders/order-display';
import { RefundIcon } from '../../../../components/icons/RefundIcon';

export default function OrderDetailPage() {
	const params = useParams<{ orderId: string }>();
	const { user, loading: sessionLoading } = useSession();
	const [order, setOrder] = useState<PlaceEtMarqueOrder | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [confirmCancel, setConfirmCancel] = useState(false);
	const [cancelNote, setCancelNote] = useState('');

	async function refresh() {
		if(!params.orderId) {
			return;
		}
		setOrder(await getBuyerOrder(params.orderId));
	}

	useEffect(() => {
		if(!user || !params.orderId) {
			return;
		}
		refresh().catch((loadError) => {
			setError(
				loadError instanceof Error
					? loadError.message
					: 'Could not load order.',
			);
		});
	}, [user, params.orderId]);

	async function onCancel() {
		if(!params.orderId) {
			return;
		}

		setBusy(true);
		setError(null);
		try {
			await cancelBuyerOrder(
				params.orderId,
				cancelNote.trim() || undefined,
			);
			setConfirmCancel(false);
			await refresh();
			setCancelNote('');
		}
		catch(cancelError) {
			setError(
				cancelError instanceof Error
					? cancelError.message
					: 'Could not cancel order.',
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
			<BackLink href="/place-et-marque/orders">
				Back to orders
			</BackLink>

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

			{order
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
						<div
							className="
								flex
								flex-wrap
								items-start
								justify-between
								gap-4
							"
						>
							<div className="min-w-0 flex-1">
								<h1
									className="
										text-2xl
										font-semibold
									"
								>
									{order.vendor?.name ?? 'Order'}
								</h1>
								<p
									className="
										mt-1
										text-base
										font-medium
										text-slate-800
									"
								>
									{order.orderRef}
								</p>
								<p
									className="
										mt-2
										text-sm
										text-slate-600
									"
								>
									{formatOrderStatus(order.status)}
									{order.shippingLabel
										? ` · ${order.shippingLabel}`
										: ''
									}
								</p>
								<p className="text-sm text-slate-500">
									{new Date(order.createdAt).toLocaleString()}
									{order.shippedAt
										? ` · Shipped ${new Date(order.shippedAt).toLocaleString()}`
										: ''
									}
								</p>
								<OrderSupportCode orderId={order.id} />
							</div>
							<OrderMoneySummary
								order={order}
								perspective="buyer"
							/>
						</div>
						{order.refundedAt
							? (
								<p
									className="
										mt-3
										text-sm
										font-semibold
										text-amber-800
									"
								>
									Refunded {new Date(order.refundedAt).toLocaleString()}
									{order.refunds?.[0]
										? ` · ${formatMoney(order.refunds[0].buyerRefundCents, order.currency)}`
										: ''
									}
								</p>
							)
							: null
						}
						<p
							className="
								mt-4
								text-sm
								text-slate-600
							"
						>
							{formatShipTo(order.shipTo)}
						</p>
						<ul
							className="
								mt-4
								flex
								flex-col
								gap-2
								text-sm
								text-slate-600
							"
						>
							{order.lines.map((line) => (
								<li
									className="
										flex
										flex-wrap
										justify-between
										gap-x-3
										gap-y-0.5
									"
									key={line.id}
								>
									<span>
										{line.title} × {line.quantity}
									</span>
									<span>
										{formatMoney(line.unitPriceCents, order.currency)}
										{' each · '}
										{formatMoney(line.lineTotalCents, order.currency)}
									</span>
								</li>
							))}
						</ul>

						{order.canBuyerCancel
							? (
								<div
									className="
										mt-6
										flex
										flex-col
										items-end
										gap-3
										border-t
										border-slate-100
										pt-4
									"
								>
									{confirmCancel
										? (
											<>
												<label
													className="
														w-full
														max-w-md
														text-sm
														font-semibold
														text-slate-700
													"
												>
													Note
													<textarea
														className="
															mt-1
															w-full
															rounded-xl
															border
															border-slate-200
															px-3
															py-2
															text-sm
															font-normal
														"
														onChange={(event) => setCancelNote(event.target.value)}
														rows={2}
														value={cancelNote}
													/>
												</label>
												<OrderConfirmActions
													busy={busy}
													busyLabel="Cancelling…"
													confirmLabel="Cancel & refund"
													onConfirm={() => void onCancel()}
													onDismiss={() => setConfirmCancel(false)}
													prompt={`Refund ${formatMoney(order.totalCents, order.currency)}?`}
												/>
											</>
										)
										: (
											<>
												<button
													aria-label="Cancel & refund"
													className="
														inline-flex
														h-9
														w-9
														items-center
														justify-center
														rounded-full
														border
														border-red-300
														bg-white
														text-red-700
														hover:border-red-500
														disabled:opacity-60
														sm:hidden
													"
													disabled={busy}
													onClick={() => setConfirmCancel(true)}
													type="button"
												>
													<RefundIcon className="h-3.5 w-3.5" />
												</button>
												<button
													className="
														hidden
														items-center
														gap-1.5
														rounded-full
														border
														border-red-300
														bg-white
														px-4
														py-2
														text-sm
														font-semibold
														text-red-700
														hover:border-red-500
														disabled:opacity-60
														sm:inline-flex
													"
													disabled={busy}
													onClick={() => setConfirmCancel(true)}
													type="button"
												>
													<RefundIcon className="h-3.5 w-3.5" />
													Cancel & refund
												</button>
											</>
										)
									}
								</div>
							)
							: null
						}
					</section>
				)
				: null
			}
		</div>
	);
}
