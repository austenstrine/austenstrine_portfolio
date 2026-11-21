'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { listMyVendors } from '../../lib/catalog-api';
import { useSession } from '../../lib/useSession';

const IN_PLACE_EDIT_TIER_KEY = 'pem:inplace-edit-tier';

/**
 * Bulk edit scope on top of always-on per-field edit when the seller can edit.
 * field = per-field pencils only (default); page = entire results/page;
 * card = one card fully open.
 */
export type InPlaceEditTier = 'field' | 'page' | 'card';

export type InPlaceFieldName =
	| 'title'
	| 'description'
	| 'category'
	| 'price'
	| 'uom'
	| 'qty'
	| 'images';

type EditorRegistration = {
	productId: string;
	dirty: boolean;
	save: () => Promise<void>;
	discard: () => void;
};

type EditableVendorsContextValue = {
	/** Vendor ids where the signed-in user is OWNER or EDITOR. */
	editableVendorIds: ReadonlySet<string>;
	canEditVendor: (vendorId: string | undefined | null) => boolean;
	ready: boolean;
	/**
	 * Bulk scope only. Per-field edit is always available when canEditVendor.
	 * page = all editable fields on the page/results; card = one card.
	 */
	editTier: InPlaceEditTier;
	setEditTier: (tier: InPlaceEditTier) => void;
	/** True when bulk page or card scope is on (not field-only). */
	inPlaceEditActive: boolean;
	/** Focused product card when editTier === 'card'. */
	activeCardId: string | null;
	setActiveCardId: (id: string | null) => void;
	/** Focused field key (`productId:field`) while editing one field. */
	activeFieldKey: string | null;
	setActiveFieldKey: (key: string | null) => void;
	registerEditor: (registration: EditorRegistration) => void;
	unregisterEditor: (productId: string) => void;
	pageDirty: boolean;
	savingPage: boolean;
	savePage: () => Promise<void>;
	discardPage: () => void;
};

const EditableVendorsContext = createContext<EditableVendorsContextValue | null>(null);

const EDITOR_ROLES = new Set(['OWNER', 'EDITOR']);
const VALID_TIERS = new Set<InPlaceEditTier>(['field', 'page', 'card']);

/** Vendor ids where the signed-in user can in-place edit (OWNER/EDITOR). */
export function editableVendorIdsFromMine(
	vendors: Array<{ id: string; myRole: string }>,
): string[] {
	return vendors
		.filter((vendor) => EDITOR_ROLES.has(vendor.myRole))
		.map((vendor) => vendor.id);
}

export function inPlaceFieldKey(
	productId: string,
	field: InPlaceFieldName,
) {
	return `${productId}:${field}`;
}

export function parseInPlaceFieldKey(key: string | null): {
	productId: string;
	field: InPlaceFieldName;
} | null {
	if(!key) {
		return null;
	}
	const splitAt = key.indexOf(':');
	if(splitAt <= 0) {
		return null;
	}
	const productId = key.slice(0, splitAt);
	const field = key.slice(splitAt + 1) as InPlaceFieldName;
	return { productId, field };
}

/** Normalize legacy sessionStorage tiers (off/element → field). */
function normalizeEditTier(raw: string | null): InPlaceEditTier {
	if(!raw) {
		return 'field';
	}
	if(raw === 'off' || raw === 'element') {
		return 'field';
	}
	if(VALID_TIERS.has(raw as InPlaceEditTier)) {
		return raw as InPlaceEditTier;
	}
	return 'field';
}

/** Whether this product's fields may open under the current bulk scope. */
export function productEditOpen(
	tier: InPlaceEditTier,
	productId: string,
	activeCardId: string | null,
	_activeFieldKey: string | null,
) {
	if(tier === 'page') {
		return true;
	}
	if(tier === 'card') {
		return activeCardId === productId;
	}
	return false;
}

/** Whether a single field is open for input under the current scope. */
export function fieldEditOpen(
	tier: InPlaceEditTier,
	productId: string,
	field: InPlaceFieldName,
	activeCardId: string | null,
	activeFieldKey: string | null,
) {
	if(tier === 'page') {
		return true;
	}
	if(tier === 'card') {
		return activeCardId === productId;
	}
	return activeFieldKey === inPlaceFieldKey(productId, field);
}

function readStoredEditTier(): InPlaceEditTier {
	if(typeof window === 'undefined') {
		return 'field';
	}
	try {
		const raw = window.sessionStorage.getItem(IN_PLACE_EDIT_TIER_KEY);
		if(raw) {
			return normalizeEditTier(raw);
		}
		// Legacy PEM-239 boolean flag → treat as results/page bulk
		if(window.sessionStorage.getItem('pem:inplace-edit') === '1') {
			return 'page';
		}
		return 'field';
	}
	catch {
		return 'field';
	}
}

function writeStoredEditTier(tier: InPlaceEditTier) {
	if(typeof window === 'undefined') {
		return;
	}
	try {
		if(tier === 'field') {
			window.sessionStorage.removeItem(IN_PLACE_EDIT_TIER_KEY);
			window.sessionStorage.removeItem('pem:inplace-edit');
		}
		else {
			window.sessionStorage.setItem(IN_PLACE_EDIT_TIER_KEY, tier);
			window.sessionStorage.setItem('pem:inplace-edit', '1');
		}
	}
	catch {
		/* ignore quota / private mode */
	}
}

export function EditableVendorsProvider({
	children,
	initialEditableVendorIds,
}: {
	children: ReactNode;
	/**
	 * When set (including `[]`), Edit chrome is decided before paint (PEM-373).
	 * Omit only outside PeM SSR seeding.
	 */
	initialEditableVendorIds?: string[];
}) {
	const { user, loading: sessionLoading } = useSession();
	const ssrSeeded = initialEditableVendorIds !== undefined;
	const [editableVendorIds, setEditableVendorIds] = useState<ReadonlySet<string>>(
		() => new Set(initialEditableVendorIds ?? []),
	);
	const [ready, setReady] = useState(() => ssrSeeded);
	const [editTier, setEditTierState] = useState<InPlaceEditTier>('field');
	const [activeCardId, setActiveCardId] = useState<string | null>(null);
	const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
	const [editorTick, setEditorTick] = useState(0);
	const [savingPage, setSavingPage] = useState(false);
	const editorsRef = useRef(new Map<string, EditorRegistration>());

	useEffect(() => {
		setEditTierState(readStoredEditTier());
	}, []);

	useEffect(() => {
		if(sessionLoading) {
			return;
		}
		if(!user) {
			setEditableVendorIds(new Set());
			setEditTierState('field');
			writeStoredEditTier('field');
			setActiveCardId(null);
			setActiveFieldKey(null);
			setReady(true);
			return;
		}

		let cancelled = false;
		// SSR seed already decided presence; refresh quietly so Edit does not blink off.
		if(!ssrSeeded) {
			setReady(false);
		}
		listMyVendors()
			.then((vendors) => {
				if(cancelled) {
					return;
				}
				setEditableVendorIds(new Set(editableVendorIdsFromMine(vendors)));
			})
			.catch(() => {
				if(!cancelled) {
					setEditableVendorIds(new Set());
				}
			})
			.finally(() => {
				if(!cancelled) {
					setReady(true);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [sessionLoading, ssrSeeded, user]);

	const setEditTier = useCallback((tier: InPlaceEditTier) => {
		const next = normalizeEditTier(tier);
		setEditTierState(next);
		writeStoredEditTier(next);
		if(next !== 'card') {
			setActiveCardId(null);
		}
		if(next !== 'field') {
			setActiveFieldKey(null);
		}
	}, []);

	const registerEditor = useCallback((registration: EditorRegistration) => {
		editorsRef.current.set(registration.productId, registration);
		setEditorTick((tick) => tick + 1);
	}, []);

	const unregisterEditor = useCallback((productId: string) => {
		if(editorsRef.current.delete(productId)) {
			setEditorTick((tick) => tick + 1);
		}
	}, []);

	const pageDirty = useMemo(() => {
		void editorTick;
		for(const entry of editorsRef.current.values()) {
			if(entry.dirty) {
				return true;
			}
		}
		return false;
	}, [editorTick]);

	const savePage = useCallback(async () => {
		const dirty = [...editorsRef.current.values()].filter((entry) => entry.dirty);
		if(dirty.length === 0) {
			return;
		}
		setSavingPage(true);
		try {
			for(const entry of dirty) {
				await entry.save();
			}
		}
		finally {
			setSavingPage(false);
			setEditorTick((tick) => tick + 1);
		}
	}, []);

	const discardPage = useCallback(() => {
		for(const entry of editorsRef.current.values()) {
			if(entry.dirty) {
				entry.discard();
			}
		}
		setEditorTick((tick) => tick + 1);
	}, []);

	const value = useMemo<EditableVendorsContextValue>(() => ({
		editableVendorIds,
		canEditVendor: (vendorId) => Boolean(vendorId && editableVendorIds.has(vendorId)),
		ready,
		editTier,
		setEditTier,
		inPlaceEditActive: editTier !== 'field',
		activeCardId,
		setActiveCardId,
		activeFieldKey,
		setActiveFieldKey,
		registerEditor,
		unregisterEditor,
		pageDirty,
		savingPage,
		savePage,
		discardPage,
	}), [
		editableVendorIds,
		ready,
		editTier,
		setEditTier,
		activeCardId,
		activeFieldKey,
		registerEditor,
		unregisterEditor,
		pageDirty,
		savingPage,
		savePage,
		discardPage,
	]);

	return (
		<EditableVendorsContext.Provider value={value}>
			{children}
		</EditableVendorsContext.Provider>
	);
}

export function useEditableVendors(): EditableVendorsContextValue {
	const value = useContext(EditableVendorsContext);
	if(!value) {
		throw new Error('useEditableVendors requires EditableVendorsProvider');
	}
	return value;
}
