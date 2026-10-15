const STORAGE_KEY = 'marketplace-walkthrough';

export type WalkthroughMacroStep =
	| 'account'
	| 'vendor'
	| 'uoms'
	| 'category'
	| 'product'
	| 'explore';

export type WalkthroughState = {
	vendorId?: string;
	vendorSlug?: string;
	categoryId?: string;
	categorySlug?: string;
	productSlug?: string;
	completedAt?: string;
	active?: boolean;
};

export type WalkthroughMacroDefinition = {
	id: WalkthroughMacroStep;
	label: string;
	hint: string;
};

export const WALKTHROUGH_MACROS: WalkthroughMacroDefinition[] = [
	{
		id: 'account',
		label: 'Sign in',
		hint: 'Create an account or sign in so vendor actions are yours.',
	},
	{
		id: 'vendor',
		label: 'Create vendor',
		hint: 'Creating a vendor makes you its OWNER and sets your store URL.',
	},
	{
		id: 'uoms',
		label: 'Add units',
		hint: 'Add SPOOL and FT so a wire product can sell by the spool and by the foot.',
	},
	{
		id: 'category',
		label: 'Add category',
		hint: 'Create a Wire & Cable category for browse and search.',
	},
	{
		id: 'product',
		label: 'Spool of wire',
		hint: 'Create a sample spool product with pack and piece offerings.',
	},
	{
		id: 'explore',
		label: 'Explore',
		hint: 'Browse, search, and open the product page with quick-edit.',
	},
];

export function loadWalkthroughState(): WalkthroughState {
	if(typeof window === 'undefined') {
		return {};
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as WalkthroughState) : {};
	}
	catch {
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

export function beginWalkthrough(): WalkthroughState {
	return saveWalkthroughState({ active: true });
}

export function dismissWalkthrough(): WalkthroughState {
	return saveWalkthroughState({ active: false });
}

export function resolveMacroStep(input: {
	signedIn: boolean;
	hasVendor: boolean;
	hasPackAndPieceUoms: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
}): WalkthroughMacroStep {
	if(!input.signedIn) {
		return 'account';
	}
	if(!input.hasVendor) {
		return 'vendor';
	}
	if(!input.hasPackAndPieceUoms) {
		return 'uoms';
	}
	if(!input.hasCategory) {
		return 'category';
	}
	if(!input.hasProduct) {
		return 'product';
	}
	return 'explore';
}

export function macroIndex(step: WalkthroughMacroStep): number {
	return WALKTHROUGH_MACROS.findIndex((row) => row.id === step);
}

export function nextMacro(step: WalkthroughMacroStep): WalkthroughMacroDefinition | null {
	const index = macroIndex(step);
	if(index < 0 || index >= WALKTHROUGH_MACROS.length - 1) {
		return null;
	}
	return WALKTHROUGH_MACROS[index + 1] ?? null;
}

export function currentMacro(step: WalkthroughMacroStep): WalkthroughMacroDefinition {
	return WALKTHROUGH_MACROS.find((row) => row.id === step) ?? WALKTHROUGH_MACROS[0];
}
