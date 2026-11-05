'use client';

import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
	formatMoney,
	formatOrderStatus,
	listVendorOrders,
	refundVendorOrder,
	shipVendorOrder,
	type PlaceEtMarqueOrder,
} from '../../../../../lib/checkout-api';
import { getMyVendor, type VendorDetail } from '../../../../../lib/catalog-api';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { BackLink } from '../../../../../components/BackLink';
import { useSession } from '../../../../../lib/useSession';

function formatShipTo(shipTo: PlaceEtMarqueOrder['shipTo']): string {
	const cityLine = [
		shipTo.city,
		[shipTo.region, shipTo.postal].filter(Boolean).join(' '),
	]
		.filter(Boolean)
		.join(', ');
	return [
		shipTo.name,
		shipTo.line1,
		shipTo.line2,
		cityLine,
		shipTo.country && shipTo.country !== 'US'
			? shipTo.country
			: null,
	]
		.filter(Boolean)
		.join(', ');
}

function VendorOrdersPageContent() {
	const params = useParams<{ vendorId: string }>();
	const vendorRef = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [vendor, setVendor] = useState<VendorDetail | null>(null);
	const [orders, setOrders] = useState<PlaceEtMarqueOrder[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const vendorId = vendor?.id;
	const vendorSlug = vendor?.slug || vendorRef;

	async function refresh(resolvedId?: string) {
		const id = resolvedId || vendorId;
		if(!id) {
			return;
		}
		setOrders(await listVendorOrders(id));
	}

	useEffect(() => {
		if(!user || !vendorRef) {
			return;
		}
		getMyVendor(vendorRef)
			.then(async (detail) => {
				setVendor(detail);
				await refresh(detail.id);
			})
			.catch((loadError) => {
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load vendor orders.',
				);
			});
	}, [user, vendorRef]);

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
			<BackLink href={`/place-et-marque/vendors/${vendorSlug}`}>
				Back to vendor
			</BackLink>

			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				{vendor
					? `${vendor.name} orders`
					: 'Vendor orders'
				}
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
													{order.orderRef} ·{' '}
													{formatOrderStatus(order.status)}
												</p>
												<p className="text-sm text-slate-600">
													{order.buyerEmail ?? 'Buyer'} ·{' '}
													{formatMoney(order.totalCents, order.currency)}
													{typeof order.vendorNetCents === 'number'
														? ` · Your net ${formatMoney(order.vendorNetCents, order.currency)}`
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
												<p className="text-sm text-slate-500">
													Ship to {formatShipTo(order.shipTo)}
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
																bg-sky
																px-4
																py-2
																text-sm
																font-semibold
																text-white
																hover:bg-sky/90
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
