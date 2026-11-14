import {
	formatMoney,
	type PlaceEtMarqueOrder,
} from '../../lib/checkout-api';

export function OrderMoneySummary({
	order,
	perspective,
}: {
	order: PlaceEtMarqueOrder;
	perspective: 'buyer' | 'seller';
}) {
	const feeCents = order.feeCents;
	const vendorNetCents = order.vendorNetCents;

	return (
		<div
			className="
				text-sm
				text-slate-600
			"
		>
			<p className="font-semibold text-ink">
				{formatMoney(order.totalCents, order.currency)}
			</p>
			<p>
				{formatMoney(order.merchandiseCents, order.currency)} items
				{order.shippingCents > 0
					? ` · ${formatMoney(order.shippingCents, order.currency)} shipping`
					: ''
				}
			</p>
			{perspective === 'seller'
				&& typeof vendorNetCents === 'number'
				? (
					<p>
						{typeof feeCents === 'number' && feeCents > 0
							? `${formatMoney(feeCents, order.currency)} fee · `
							: ''
						}
						You get {formatMoney(vendorNetCents, order.currency)}
					</p>
				)
				: null
			}
		</div>
	);
}
