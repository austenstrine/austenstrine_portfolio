'use client';

import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
	formatMoney,
	listVendorOrders,
	refundVendorOrder,
	shipVendorOrder,
	type PlaceEtMarqueOrder,
} from '../../../../../lib/checkout-api';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { BackLink } from '../../../../../components/BackLink';
import { useSession } from '../../../../../lib/useSession';

function VendorOrdersPageContent() {
	const params = useParams<{ vendorId: string }>();
	const vendorId = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [orders, setOrders] = useState<PlaceEtMarqueOrder[]>([]);
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
		catch(shipError) {
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

	async function onRefund(order: PlaceEtMarqueOrder) {
		if(!vendorId) {
			return;
		}
		const confirmed = window.confirm(
			`Refund ${formatMoney(order.totalCents, order.currency)} to the buyer for ${order.orderRef}?`,
		);
		if(!confirmed) {
			return;
		}

		setBusyId(order.id);
		setError(null);
		try {
			await refundVendorOrder(vendorId, order.id, {
				asCancel: order.status !== 'SHIPPED',
			});
			await refresh();
		}
		catch(refundError) {
			setError(
				refundError instanceof Error
					? refundError.message
					: 'Could not refund order.',
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
			<BackLink href={`/place-et-marque/vendors/${vendorId}`}>
				Back to vendor
			</BackLink>

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
											<div
												className="
													flex
													flex-wrap
													gap-2
												"
											>
												{order.status === 'PAID' || order.status === 'FULFILLING'
													? (
														<button
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
															disabled={busyId === order.id}
															onClick={() => void onShip(order.id)}
															type="button"
														>
															{busyId === order.id
																? 'Shipping…'
																: 'Mark shipped'
															}
														</button>
													)
													: null
												}
												{order.canVendorRefund
													? (
														<button
															className="
																rounded-full
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
															disabled={busyId === order.id}
															onClick={() => void onRefund(order)}
															type="button"
														>
															{busyId === order.id
																? 'Working…'
																: order.status === 'SHIPPED'
																	? 'Refund buyer'
																	: 'Cancel & refund'
															}
														</button>
													)
													: null
												}
											</div>
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
				: null
			}
		</div>
	);
}

export default function VendorOrdersPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess
				vendorRequired
				reasonKey="vendorOrders"
			>
				<VendorOrdersPageContent />
			</RequireAccess>
		</Suspense>
	);
}
