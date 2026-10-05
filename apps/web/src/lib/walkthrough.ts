const STORAGE_KEY = 'marketplace-walkthrough';

export type WalkthroughState = {
	vendorId?: string;
	vendorSlug?: string;
	categoryId?: string;
	categorySlug?: string;
	productSlug?: string;
	completedAt?: string;
};

export function loadWalkthroughState(): WalkthroughState {
	if(typeof window === 'undefined') {
		return {};
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as WalkthroughState) : {};
	} catch {
		return {};
	}
}

export function saveWalkthroughState(patch: Partial<WalkthroughState>): WalkthroughState {
	const next = { ...loadWalkthroughState(), ...patch };
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	return next;
}

export function clearWalkthroughState(): void {
	window.localStorage.removeItem(STORAGE_KEY);
}
