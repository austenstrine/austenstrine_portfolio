'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
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

	useEffect(() => {
		if(!user || !params.orderId) {
			return;
		}
		getBuyerOrder(params.orderId)
			.then(setOrder)
			.catch((loadError) => {
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load order.',
				);
			});
	}, [user, params.orderId]);

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
					</section>
				)
				: null}
		</div>
	);
}
