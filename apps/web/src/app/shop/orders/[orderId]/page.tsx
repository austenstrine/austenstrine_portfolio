'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	cancelBuyerOrder,
	formatMoney,
	getBuyerOrder,
	type ShopOrder,
} from '../../../../lib/checkout-api';
import { useSession } from '../../../../lib/useSession';

export default function OrderDetailPage() {
	const params = useParams<{ orderId: string }>();
	const { user, loading: sessionLoading } = useSession();
	const [order, setOrder] = useState<ShopOrder | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
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
		const confirmed = window.confirm(
			'Cancel this order and refund the charge? This cannot be undone.',
		);
		if(!confirmed) {
			return;
		}

		setBusy(true);
		setError(null);
		try {
			await cancelBuyerOrder(
				params.orderId,
				cancelNote.trim() || undefined,
			);
			await refresh();
			setCancelNote('');
		}
		catch (cancelError) {
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
			<Link
				className="
					text-sm
					font-semibold
					text-sky
					hover:underline
				"
				href="/shop/orders"
			>
				← Back to orders
			</Link>

			{sessionLoading
				? (
					<p className="text-sm text-slate-500">
						Checking session…
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
						<h1
							className="
								text-2xl
								font-semibold
							"
						>
							{order.vendor?.name ?? 'Order'} · {order.orderRef}
						</h1>
						<p
							className="
								mt-2
								text-sm
								text-slate-600
							"
						>
							{order.status} · {formatMoney(order.totalCents, order.currency)}
							{order.shippingLabel ? ` · ${order.shippingLabel}` : ''}
						</p>
						{order.refundedAt
							? (
								<p
									className="
										mt-2
										text-sm
										font-semibold
										text-amber-800
									"
								>
									Refunded {new Date(order.refundedAt).toLocaleString()}
									{order.refunds?.[0]
										? ` · ${formatMoney(order.refunds[0].buyerRefundCents, order.currency)}`
										: ''}
								</p>
							)
							: null}
						<p
							className="
								mt-4
								text-sm
								text-slate-600
							"
						>
							Ship to {order.shipTo.name}, {order.shipTo.line1}
							{order.shipTo.line2 ? `, ${order.shipTo.line2}` : ''},{' '}
							{order.shipTo.city}, {order.shipTo.region}{' '}
							{order.shipTo.postal}
						</p>
						<ul
							className="
								mt-4
								flex
								flex-col
								gap-2
								text-sm
							"
						>
							{order.lines.map((line) => (
								<li
									className="
										flex
										justify-between
										gap-3
									"
									key={line.id}
								>
									<span>
										{line.title} × {line.quantity} ({line.sku})
									</span>
									<span>
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
										border-t
										border-slate-100
										pt-4
									"
								>
									<p
										className="
											text-sm
											text-slate-600
										"
									>
										Cancel before the vendor ships to receive a full refund
										(merchandise + shipping).
									</p>
									<label
										className="
											mt-3
											block
											text-sm
											font-semibold
											text-slate-700
										"
									>
										Optional note
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
									<button
										className="
											mt-3
											rounded-xl
											border
											border-red-300
											px-4
											py-2
											text-sm
											font-semibold
											text-red-700
											hover:border-red-500
											disabled:opacity-60
										"
										disabled={busy}
										onClick={() => void onCancel()}
										type="button"
									>
										{busy
											? 'Cancelling…'
											: 'Cancel & refund'}
									</button>
								</div>
							)
							: null}
					</section>
				)
				: null}
		</div>
	);
}
