import { API_BASE_URL } from './api';
import { authedFetch } from './auth-api';

async function checkoutRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await authedFetch(`/checkout${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	const body = await response.json().catch(() => null);
	if(!response.ok) {
		const message = body?.message ?? 'Checkout request failed.';
		throw new Error(Array.isArray(message) ? message.join(' ') : message);
	}

	return body as T;
}

export type CartDto = {
	id: string;
	lineCount: number;
	lines: Array<{
		id: string;
		offeringId: string;
		quantity: string;
		availableQty: string;
		unitPriceCents: number;
		currency: string;
		lineTotalCents: number;
		sku: string;
		offeringKey: string;
		role: string;
		uom: string;
		title: string;
		productSlug: string;
		vendor: { id: string; slug: string; name: string };
		shippingProfileId: string | null;
	}>;
};

export type CheckoutPreview = {
	merchandiseCents: number;
	currency: string;
	groups: Array<{
		groupKey: string;
		vendorId: string;
		vendorName: string;
		shippingProfileId: string;
		shippingProfileCode: string;
		shippingProfileName: string;
		shipsSeparately: boolean;
		currency: string;
		merchandiseCents: number;
		lines: Array<{
			offeringId: string;
			quantity: string;
			unitPriceCents: number;
			lineTotalCents: number;
			title: string;
			sku: string;
			offeringKey: string;
		}>;
		rates: Array<{ id: string; label: string; amountCents: number }>;
	}>;
};

export type CheckoutSession = {
	checkoutId: string;
	clientSecret: string | null;
	publishableKey: string | null;
	totalCents: number;
	currency: string;
	expiresAt: string | null;
};

export type ShopOrder = {
	id: string;
	orderRef: string;
	status: string;
	currency: string;
	merchandiseCents: number;
	shippingCents: number;
	totalCents: number;
	shippingLabel: string | null;
	shipTo: {
		name: string | null;
		line1: string | null;
		line2: string | null;
		city: string | null;
		region: string | null;
		postal: string | null;
		country: string | null;
	};
	shippedAt: string | null;
	createdAt: string;
	vendor: { id: string; slug: string; name: string } | null;
	buyerEmail?: string | null;
	lines: Array<{
		id: string;
		offeringId: string;
		quantity: string;
		unitPriceCents: number;
		lineTotalCents: number;
		title: string;
		sku: string;
		offeringKey: string;
	}>;
};

export type ShippingProfile = {
	id: string;
	code: string;
	name: string;
	shipsSeparately: boolean;
	payoutTrigger?: 'ON_PAYMENT' | 'ON_SHIPMENT';
	rates: Array<{
		id: string;
		label: string;
		amountCents: number;
		minSubtotalCents: number | null;
		maxSubtotalCents: number | null;
	}>;
};

export type ConnectStatus = {
	vendorId: string;
	accountId: string | null;
	detailsSubmitted: boolean;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	onboardingCompleteAt: string | null;
	canReceivePayouts: boolean;
	platformFeeBpsOverride: number | null;
	pendingCount?: number;
	lastError?: string | null;
	lastErrorAt?: string | null;
	recent?: Array<{
		id: string;
		orderId: string;
		status: string;
		vendorNetCents: number;
		feeCents: number;
		trigger: string;
		lastError: string | null;
		transferredAt: string | null;
		createdAt: string;
	}>;
};

export function getCart(): Promise<CartDto> {
	return checkoutRequest<CartDto>('/cart');
}

export function upsertCartLine(offeringId: string, quantity: string): Promise<CartDto> {
	return checkoutRequest<CartDto>('/cart/lines', {
		method: 'PUT',
		body: JSON.stringify({ offeringId, quantity }),
	});
}

export function removeCartLine(offeringId: string): Promise<CartDto> {
	return checkoutRequest<CartDto>(`/cart/lines/${offeringId}`, {
		method: 'DELETE',
	});
}

export function getCheckoutPreview(): Promise<CheckoutPreview> {
	return checkoutRequest<CheckoutPreview>('/preview');
}

export function createCheckoutSession(payload: {
	address: {
		name: string;
		line1: string;
		line2?: string;
		city: string;
		region: string;
		postal: string;
		country?: string;
	};
	shipments: Array<{
		groupKey: string;
		rateId: string;
		address?: {
			name: string;
			line1: string;
			line2?: string;
			city: string;
			region: string;
			postal: string;
			country?: string;
		};
	}>;
}): Promise<CheckoutSession> {
	return checkoutRequest<CheckoutSession>('/sessions', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function listBuyerOrders(): Promise<ShopOrder[]> {
	return checkoutRequest<ShopOrder[]>('/orders');
}

export function getBuyerOrder(orderId: string): Promise<ShopOrder> {
	return checkoutRequest<ShopOrder>(`/orders/${orderId}`);
}

export function listVendorShippingProfiles(vendorId: string): Promise<ShippingProfile[]> {
	return checkoutRequest<ShippingProfile[]>(`/vendors/${vendorId}/shipping-profiles`);
}

export function upsertVendorShippingProfile(
	vendorId: string,
	payload: {
		code: string;
		name: string;
		shipsSeparately?: boolean;
		payoutTrigger?: 'ON_PAYMENT' | 'ON_SHIPMENT';
		rates?: Array<{
			id?: string;
			label: string;
			amountCents: number;
			minSubtotalCents?: number | null;
			maxSubtotalCents?: number | null;
		}>;
	},
): Promise<ShippingProfile> {
	return checkoutRequest<ShippingProfile>(`/vendors/${vendorId}/shipping-profiles`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	});
}

export function getVendorConnectStatus(vendorId: string): Promise<ConnectStatus> {
	return checkoutRequest<ConnectStatus>(`/vendors/${vendorId}/payouts/summary`);
}

export function createVendorConnectAccountLink(
	vendorId: string,
): Promise<{ url: string; expiresAt: number }> {
	return checkoutRequest<{ url: string; expiresAt: number }>(
		`/vendors/${vendorId}/connect/account-link`,
		{ method: 'POST', body: JSON.stringify({}) },
	);
}

export function listVendorOrders(vendorId: string): Promise<ShopOrder[]> {
	return checkoutRequest<ShopOrder[]>(`/vendors/${vendorId}/orders`);
}

export function shipVendorOrder(vendorId: string, orderId: string): Promise<ShopOrder> {
	return checkoutRequest<ShopOrder>(`/vendors/${vendorId}/orders/${orderId}/ship`, {
		method: 'POST',
		body: JSON.stringify({}),
	});
}

export function stripePublishableKeyFallback(): string {
	return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
}

export function formatMoney(cents: number, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(cents / 100);
}

/** Public helper for docs / webhook URL */
export function stripeWebhookUrl(): string {
	return `${API_BASE_URL}/checkout/webhooks/stripe`;
}
