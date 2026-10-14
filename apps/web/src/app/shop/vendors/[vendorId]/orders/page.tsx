'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	formatMoney,
	listVendorOrders,
	shipVendorOrder,
	type ShopOrder,
} from '../../../../../lib/checkout-api';
import { useSession } from '../../../../../lib/useSession';

export default function VendorOrdersPage() {
	const params = useParams<{ vendorId: string }>();
	const vendorId = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [orders, setOrders] = useState<ShopOrder[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	async function refresh() {
		if(!vendorId) {
			return;
		}
		setOrders(await listVendorOrders(vendorId));
	}

	useEffect(() => {
		if(!user || !vendorId) {
			return;
		}
		refresh().catch((loadError) => {
			setError(
				loadError instanceof Error
					? loadError.message
					: 'Could not load vendor orders.',
			);
		});
	}, [user, vendorId]);

	async function onShip(orderId: string) {
		if(!vendorId) {
			return;
		}
		setBusyId(orderId);
		setError(null);
		try {
			await shipVendorOrder(vendorId, orderId);
			await refresh();
		}
		catch (shipError) {
			setError(
				shipError instanceof Error
					? shipError.message
					: 'Could not mark shipped.',
			);
		}
		finally {
			setBusyId(null);
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
				href={`/shop/vendors/${vendorId}`}
			>
				← Back to vendor
			</Link>

			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				Vendor orders
			</h1>

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
													{order.orderRef} · {order.status}
												</p>
												<p className="text-sm text-slate-600">
													{order.buyerEmail ?? 'Buyer'} ·{' '}
													{formatMoney(order.totalCents, order.currency)}
												</p>
												<p className="text-sm text-slate-500">
													{order.shipTo.name}, {order.shipTo.line1},{' '}
													{order.shipTo.city}
												</p>
											</div>
											{order.status === 'PAID' || order.status === 'FULFILLING'
												? (
													<button
														type="button"
														disabled={busyId === order.id}
														className="
															rounded-full
															bg-ink
															px-4
															py-2
															text-sm
															font-semibold
															text-white
															hover:bg-sky
															disabled:opacity-60
														"
														onClick={() => void onShip(order.id)}
													>
														{busyId === order.id
															? 'Shipping…'
															: 'Mark shipped'}
													</button>
												)
												: null}
										</div>
										<ul
											className="
												mt-3
												flex
												flex-col
												gap-1
												text-sm
												text-slate-600
											"
										>
											{order.lines.map((line) => (
												<li key={line.id}>
													{line.title} × {line.quantity}
												</li>
											))}
										</ul>
									</li>
								))}
							</ul>
						)
				)
				: null}
		</div>
	);
}
