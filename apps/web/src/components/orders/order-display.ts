import {
	formatOrderStatus,
	type PlaceEtMarqueOrder,
} from '../../lib/checkout-api';

export type OrderStatusFilter =
	| 'all'
	| 'needs-ship'
	| 'shipped'
	| 'refunded'
	| 'cancelled';

export const ORDER_STATUS_FILTERS: Array<{
	id: OrderStatusFilter;
	label: string;
}> = [
	{ id: 'all', label: 'All' },
	{ id: 'needs-ship', label: 'Needs shipping' },
	{ id: 'shipped', label: 'Shipped' },
	{ id: 'refunded', label: 'Refunded' },
	{ id: 'cancelled', label: 'Cancelled' },
];

export function formatShipTo(shipTo: PlaceEtMarqueOrder['shipTo']): string {
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

export function orderNeedsShipping(order: PlaceEtMarqueOrder): boolean {
	return order.status === 'PAID' || order.status === 'FULFILLING';
}

/** Cancel/refund APIs land as REFUNDED; cancel reasons also set cancelledAt. */
export function orderWasCancelled(order: PlaceEtMarqueOrder): boolean {
	return Boolean(order.cancelledAt) || order.status === 'CANCELLED';
}

export function orderWasRefundedOnly(order: PlaceEtMarqueOrder): boolean {
	return order.status === 'REFUNDED' && !order.cancelledAt;
}

export function displayOrderStatus(order: PlaceEtMarqueOrder): string {
	if(orderWasCancelled(order)) {
		return 'Cancelled';
	}
	return formatOrderStatus(order.status);
}

export function orderMatchesStatusFilter(
	order: PlaceEtMarqueOrder,
	filter: OrderStatusFilter,
): boolean {
	if(filter === 'all') {
		return true;
	}
	if(filter === 'needs-ship') {
		return orderNeedsShipping(order);
	}
	if(filter === 'shipped') {
		return order.status === 'SHIPPED';
	}
	if(filter === 'refunded') {
		return orderWasRefundedOnly(order);
	}
	if(filter === 'cancelled') {
		return orderWasCancelled(order);
	}
	return true;
}

export function orderSearchHaystack(order: PlaceEtMarqueOrder): string {
	return [
		order.orderRef,
		order.buyerEmail,
		order.vendor?.name,
		order.shippingLabel,
		formatShipTo(order.shipTo),
		...order.lines.map((line) => `${line.title} ${line.sku}`),
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

export function filterOrders(
	orders: PlaceEtMarqueOrder[],
	options: {
		status: OrderStatusFilter;
		query: string;
	},
): PlaceEtMarqueOrder[] {
	const query = options.query.trim().toLowerCase();
	return orders.filter((order) => {
		if(!orderMatchesStatusFilter(order, options.status)) {
			return false;
		}
		if(!query) {
			return true;
		}
		return orderSearchHaystack(order).includes(query);
	});
}

export function countOrdersNeedingShip(orders: PlaceEtMarqueOrder[]): number {
	return orders.filter(orderNeedsShipping).length;
}

/**
 * Orders list shell: keep MarketplaceFooter below the first fold so async
 * order cards / empty copy cannot CLS the site footer (PEM-213 host FAIL).
 * Height is 100dvh minus the fixed-header spacer only — main py-* then pushes
 * the footer past the viewport. pb-24 clears the frost filter pane without
 * waiting on --seller-bottom-pane-stack (avoids pad CLS when the stack lands).
 */
export const ORDERS_LIST_SHELL_CLASSNAME = `
	flex
	min-h-[calc(100dvh-var(--catalog-header-h,4.5rem))]
	flex-col
	gap-6
	pb-24
`;
