'use client';

import { useParams } from 'next/navigation';
import {
	Suspense,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	formatMoney,
	listVendorOrders,
	refundVendorOrder,
	shipVendorOrder,
	type PlaceEtMarqueOrder,
} from '../../../../../lib/checkout-api';
import { getMyVendor, type VendorDetail } from '../../../../../lib/catalog-api';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { BackLink } from '../../../../../components/BackLink';
import { PageBottomPanePortal } from '../../../../../components/catalog/CatalogSearchContext';
import { OrderConfirmActions } from '../../../../../components/orders/OrderConfirmActions';
import { OrderMoneySummary } from '../../../../../components/orders/OrderMoneySummary';
import { OrderSupportCode } from '../../../../../components/orders/OrderSupportCode';
import {
	ORDER_STATUS_FILTERS,
	ORDERS_LIST_SHELL_CLASSNAME,
	countOrdersNeedingShip,
	displayOrderStatus,
	filterOrders,
	formatShipTo,
	orderNeedsShipping,
	type OrderStatusFilter,
} from '../../../../../components/orders/order-display';
import { RefundIcon } from '../../../../../components/icons/RefundIcon';
import { TruckIcon } from '../../../../../components/icons/TruckIcon';
import { useSession } from '../../../../../lib/useSession';

const frostControlClassName = `
	rounded-full
	border
	border-slate-300
	bg-white
	px-2.5
	py-1.5
	text-sm
	font-semibold
	text-ink
`;

function VendorOrdersPageContent() {
	const params = useParams<{ vendorId: string }>();
	const vendorRef = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [vendor, setVendor] = useState<VendorDetail | null>(null);
	const [orders, setOrders] = useState<PlaceEtMarqueOrder[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const busyRef = useRef(false);
	const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null);
	const [filterText, setFilterText] = useState('');
	const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
	const deferredFilterText = useDeferredValue(filterText);
	const vendorId = vendor?.id;
	const vendorSlug = vendor?.slug || vendorRef;

	const visibleOrders = useMemo(
		() => filterOrders(orders, {
			status: statusFilter,
			query: deferredFilterText,
		}),
		[orders, statusFilter, deferredFilterText],
	);
	const needsShipCount = countOrdersNeedingShip(orders);
	const filtersActive = statusFilter !== 'all' || deferredFilterText.trim().length > 0;

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
		if(!vendorId || busyRef.current) {
			return;
		}
		busyRef.current = true;
		setBusyId(orderId);
		setError(null);
		setConfirmRefundId(null);
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
			busyRef.current = false;
			setBusyId(null);
		}
	}

	async function onRefund(order: PlaceEtMarqueOrder) {
		if(!vendorId || busyRef.current) {
			return;
		}
		busyRef.current = true;
		setBusyId(order.id);
		setError(null);
		try {
			await refundVendorOrder(vendorId, order.id, {
				asCancel: order.status !== 'SHIPPED',
			});
			setConfirmRefundId(null);
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
			busyRef.current = false;
			setBusyId(null);
		}
	}

	function refundLabel(order: PlaceEtMarqueOrder): string {
		return order.status === 'SHIPPED'
			? 'Refund buyer'
			: 'Cancel & refund';
	}

	return (
		<div className={ORDERS_LIST_SHELL_CLASSNAME}>
			<PageBottomPanePortal>
				<label
					className="
						inline-flex
						min-w-[9rem]
						max-w-[14rem]
						flex-1
						flex-col
						gap-0.5
						text-[11px]
						font-medium
						text-slate-500
					"
				>
					<span>
						Filter
					</span>
					<input
						aria-label="Filter orders"
						className={frostControlClassName}
						onChange={(event) => setFilterText(event.target.value)}
						placeholder="Buyer, product, place"
						type="search"
						value={filterText}
					/>
				</label>
				<label
					className="
						inline-flex
						flex-col
						gap-0.5
						text-[11px]
						font-medium
						text-slate-500
					"
				>
					<span>
						Status
					</span>
					<select
						aria-label="Order status filter"
						className={frostControlClassName}
						onChange={(event) => {
							const next = event.target.value as OrderStatusFilter;
							if(ORDER_STATUS_FILTERS.some((row) => row.id === next)) {
								setStatusFilter(next);
							}
						}}
						value={statusFilter}
					>
						{ORDER_STATUS_FILTERS.map((row) => (
							<option
								key={row.id}
								value={row.id}
							>
								{row.label}
							</option>
						))}
					</select>
				</label>
			</PageBottomPanePortal>

			<BackLink href={`/place-et-marque/vendors/${vendorSlug}`}>
				Back to vendor
			</BackLink>

			<div>
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
				{orders.length > 0
					? (
						<p className="mt-2 text-sm text-slate-600">
							{orders.length} order{orders.length === 1 ? '' : 's'}
							{needsShipCount > 0
								? ` · ${needsShipCount} need shipping`
								: ''
							}
						</p>
					)
					: null
				}
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

			{user
				? (
					orders.length === 0
						? (
							<p className="text-sm text-slate-500">
								No paid orders yet.
							</p>
						)
						: visibleOrders.length === 0
							? (
								<p className="text-sm text-slate-500">
									{filtersActive
										? 'No orders match these filters.'
										: 'No paid orders yet.'
									}
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
									{visibleOrders.map((order) => {
										const busy = busyId === order.id;
										const confirming = confirmRefundId === order.id;
										const canShip = orderNeedsShipping(order);
										const canRefund = Boolean(order.canVendorRefund);

										return (
											<li
												className="
													rounded-2xl
													border
													border-slate-200
													bg-white
													p-4
													scroll-mt-24
												"
												id={order.id}
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
													<div className="min-w-0 flex-1">
														<p className="font-semibold">
															{order.orderRef}
														</p>
														<p className="text-sm text-slate-700">
															{displayOrderStatus(order)}
															{order.buyerEmail
																? ` · ${order.buyerEmail}`
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
															{formatShipTo(order.shipTo)}
														</p>
														<OrderSupportCode orderId={order.id} />
													</div>
													<div
														className="
															flex
															min-w-[8.5rem]
															flex-col
															items-end
															gap-3
														"
													>
														<OrderMoneySummary
															order={order}
															perspective="seller"
														/>
														{confirming
															? (
																<OrderConfirmActions
																	busy={busy}
																	busyLabel="Working…"
																	confirmLabel={
																		order.status === 'SHIPPED'
																			? 'Refund'
																			: 'Cancel & refund'
																	}
																	onConfirm={() => void onRefund(order)}
																	onDismiss={() => setConfirmRefundId(null)}
																	prompt={`Refund ${formatMoney(order.totalCents, order.currency)}?`}
																/>
															)
															: (
																<div
																	className="
																		flex
																		flex-wrap
																		justify-end
																		gap-2
																	"
																>
																	{canShip
																		? (
																			<>
																				<button
																					aria-label="Mark shipped"
																					className="
																						inline-flex
																						h-9
																						w-9
																						items-center
																						justify-center
																						rounded-full
																						bg-sky
																						text-white
																						hover:bg-sky/90
																						disabled:opacity-60
																						sm:hidden
																					"
																					disabled={busy}
																					onClick={() => void onShip(order.id)}
																					type="button"
																				>
																					<TruckIcon className="h-3.5 w-3.5" />
																				</button>
																				<button
																					className="
																						hidden
																						items-center
																						gap-1.5
																						rounded-full
																						bg-sky
																						px-4
																						py-2
																						text-sm
																						font-semibold
																						text-white
																						hover:bg-sky/90
																						disabled:opacity-60
																						sm:inline-flex
																					"
																					disabled={busy}
																					onClick={() => void onShip(order.id)}
																					type="button"
																				>
																					<TruckIcon className="h-3.5 w-3.5" />
																					{busy
																						? 'Shipping…'
																						: 'Mark shipped'
																					}
																				</button>
																			</>
																		)
																		: null
																	}
																	{canRefund
																		? (
																			<>
																				<button
																					aria-label={refundLabel(order)}
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
																					onClick={() => setConfirmRefundId(order.id)}
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
																					onClick={() => setConfirmRefundId(order.id)}
																					type="button"
																				>
																					<RefundIcon className="h-3.5 w-3.5" />
																					{refundLabel(order)}
																				</button>
																			</>
																		)
																		: null
																	}
																</div>
															)
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
										);
									})}
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
