'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	Suspense,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	listBuyerOrders,
	type PlaceEtMarqueOrder,
} from '../../../lib/checkout-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { OrderMoneySummary } from '../../../components/orders/OrderMoneySummary';
import { OrdersListFilters } from '../../../components/orders/OrdersListFilters';
import {
	ORDERS_LIST_SHELL_CLASSNAME,
	displayOrderStatus,
	filterOrders,
	type OrderStatusFilter,
} from '../../../components/orders/order-display';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';

const BUYER_STATUS_FILTERS: Array<{
	id: OrderStatusFilter;
	label: string;
}> = [
	{ id: 'all', label: 'All' },
	{ id: 'needs-ship', label: 'Awaiting shipment' },
	{ id: 'shipped', label: 'Shipped' },
	{ id: 'refunded', label: 'Refunded' },
	{ id: 'cancelled', label: 'Cancelled' },
];

function OrdersContent() {
	const { user, loading: sessionLoading } = useSession();
	const searchParams = useSearchParams();
	const paid = searchParams.get('paid') === '1';
	const [orders, setOrders] = useState<PlaceEtMarqueOrder[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [filterText, setFilterText] = useState('');
	const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
	const deferredFilterText = useDeferredValue(filterText);

	const visibleOrders = useMemo(
		() => filterOrders(orders, {
			status: statusFilter,
			query: deferredFilterText,
		}),
		[orders, statusFilter, deferredFilterText],
	);
	const filtersActive = statusFilter !== 'all' || deferredFilterText.trim().length > 0;

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
			<div
				className="
					flex
					flex-wrap
					items-end
					justify-between
					gap-4
				"
			>
				<div className="min-w-0 flex-1">
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
									text-asgreen
								"
							>
								Payment received.
							</p>
						)
						: null
					}
					{orders.length > 0
						? (
							<p className="mt-2 text-sm text-slate-600">
								{orders.length} order{orders.length === 1 ? '' : 's'}
							</p>
						)
						: null
					}
				</div>
				<div
					className="
						ml-auto
						flex
						flex-wrap
						items-end
						justify-end
						gap-x-2
						gap-y-2
					"
				>
					<OrdersListFilters
						filterPlaceholder="Vendor, product, place"
						filterText={filterText}
						onFilterTextChange={setFilterText}
						onStatusFilterChange={setStatusFilter}
						statusFilter={statusFilter}
						statusOptions={BUYER_STATUS_FILTERS}
					/>
				</div>
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
									{visibleOrders.map((order) => (
										<li key={order.id}>
											<Link
												className="
													flex
													flex-wrap
													items-start
													justify-between
													gap-3
													rounded-2xl
													border
													border-slate-200
													bg-white
													p-4
													transition
													hover:border-sky
												"
												href={`/place-et-marque/orders/${order.id}`}
											>
												<div className="min-w-0 flex-1">
													<p className="font-semibold">
														{order.vendor?.name ?? 'Vendor'}
													</p>
													<p className="text-sm text-slate-700">
														{order.orderRef}
													</p>
													<p className="text-sm text-slate-600">
														{displayOrderStatus(order)} ·{' '}
														{new Date(order.createdAt).toLocaleString()}
													</p>
												</div>
												<div
													className="
														flex
														items-start
														gap-2
													"
												>
													<OrderMoneySummary
														order={order}
														perspective="buyer"
													/>
													<ArrowRightIcon
														className="
															mt-1
															h-3.5
															w-3.5
															shrink-0
															text-slate-400
														"
													/>
												</div>
											</Link>
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

export default function OrdersClient() {
	// Shell outside Suspense/RequireAccess so SSR + "Loading…" / "Checking
	// access…" keep MarketplaceFooter below the fold (PEM-213 gate reject).
	return (
		<div className={ORDERS_LIST_SHELL_CLASSNAME}>
			<Suspense
				fallback={
					<p className="text-sm text-slate-500">
						Loading…
					</p>
				}
			>
				<RequireAccess reasonKey="orders">
					<OrdersContent />
				</RequireAccess>
			</Suspense>
		</div>
	);
}
