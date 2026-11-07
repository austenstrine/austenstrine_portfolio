import type { PlaceEtMarqueOrder } from '../../lib/checkout-api';

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
		return order.status === 'REFUNDED';
	}
	if(filter === 'cancelled') {
		return order.status === 'CANCELLED';
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
