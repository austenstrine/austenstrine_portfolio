/**
 * Merchandise-only platform fee. Never eats shipping.
 * feeCents = min(floor(merchandise * bps / 10000) + flat, merchandise)
 * vendorNet = merchandise - fee + shipping
 */
export function computeMerchandiseFee(input: {
	merchandiseCents: number;
	shippingCents: number;
	merchandiseFeeBps: number;
	flatFeeCents: number;
}): {
	feeCents: number;
	vendorNetCents: number;
} {
	const merchandise = Math.max(0, Math.floor(input.merchandiseCents));
	const shipping = Math.max(0, Math.floor(input.shippingCents));
	const bps = Math.max(0, Math.floor(input.merchandiseFeeBps));
	const flat = Math.max(0, Math.floor(input.flatFeeCents));

	let feeCents = Math.floor((merchandise * bps) / 10000) + flat;
	feeCents = Math.min(feeCents, merchandise);

	return {
		feeCents,
		vendorNetCents: merchandise - feeCents + shipping,
	};
}
