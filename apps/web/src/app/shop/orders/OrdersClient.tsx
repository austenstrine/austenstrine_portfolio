'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
	formatMoney,
	listBuyerOrders,
	type ShopOrder,
} from '../../../lib/checkout-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';

function OrdersContent() {
	const { user, loading: sessionLoading } = useSession();
	const searchParams = useSearchParams();
	const paid = searchParams.get('paid') === '1';
	const [orders, setOrders] = useState<ShopOrder[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if(!user) {
			return;
		}
		listBuyerOrders()
			.then(setOrders)
			.catch((loadError) => {
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load orders.',
				);
			});
	}, [user]);

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
					Your orders
				</h1>
				{paid
					? (
						<p
							className="
								mt-2
								text-sm
								font-semibold
								text-emerald-700
							"
						>
							Payment received. Orders appear below once Stripe confirms.
						</p>
					)
					: null}
			</div>

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

			{user
				? (
					orders.length === 0
						? (
							<p className="text-sm text-slate-500">
								No paid orders yet.
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
								{orders.map((order) => (
									<li
										className="
											rounded-2xl
											border
											border-slate-200
											bg-white
											p-4
										"
										key={order.id}
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
													{order.vendor?.name ?? 'Vendor'} · {order.orderRef}
												</p>
												<p className="text-sm text-slate-600">
													{order.status} ·{' '}
													{new Date(order.createdAt).toLocaleString()}
												</p>
											</div>
											<p className="font-semibold">
												{formatMoney(order.totalCents, order.currency)}
											</p>
										</div>
										<Link
											className="
												mt-3
												inline-block
												text-sm
												font-semibold
												text-sky
												hover:underline
											"
											href={`/shop/orders/${order.id}`}
										>
											View details
										</Link>
									</li>
								))}
							</ul>
						)
				)
				: null}
		</div>
	);
}

export default function OrdersClient() {
	return (
		<Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
			<RequireAccess reasonKey="orders">
				<OrdersContent />
			</RequireAccess>
		</Suspense>
	);
}
