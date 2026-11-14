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

/** Scope of what becomes editable. Off by default (PEM-245). */
export type InPlaceEditTier = 'off' | 'page' | 'card' | 'element';

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
	 * Tiered in-place edit scope. Off keeps buyer layout (PEM-239/245).
	 * page = all editable fields on the page; card = one card; element = one field.
	 */
	editTier: InPlaceEditTier;
	setEditTier: (tier: InPlaceEditTier) => void;
	/** True when editTier is not off. */
	inPlaceEditActive: boolean;
	/** Focused product card when editTier === 'card'. */
	activeCardId: string | null;
	setActiveCardId: (id: string | null) => void;
	/** Focused field key (`productId:field`) when editTier === 'element'. */
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
const VALID_TIERS = new Set<InPlaceEditTier>(['off', 'page', 'card', 'element']);

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

/** Whether this product's fields may be shown as editable under the current tier. */
export function productEditOpen(
	tier: InPlaceEditTier,
	productId: string,
	activeCardId: string | null,
	activeFieldKey: string | null,
) {
	if(tier === 'page') {
		return true;
	}
	if(tier === 'card') {
		return activeCardId === productId;
	}
	if(tier === 'element') {
		return activeFieldKey?.startsWith(`${productId}:`) ?? false;
	}
	return false;
}

/** Whether a single field is editable under the current tier. */
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
	if(tier === 'element') {
		return activeFieldKey === inPlaceFieldKey(productId, field);
	}
	return false;
}

function readStoredEditTier(): InPlaceEditTier {
	if(typeof window === 'undefined') {
		return 'off';
	}
	try {
		const raw = window.sessionStorage.getItem(IN_PLACE_EDIT_TIER_KEY);
		if(raw && VALID_TIERS.has(raw as InPlaceEditTier)) {
			return raw as InPlaceEditTier;
		}
		// Legacy PEM-239 boolean flag
		if(window.sessionStorage.getItem('pem:inplace-edit') === '1') {
			return 'page';
		}
		return 'off';
	}
	catch {
		return 'off';
	}
}

function writeStoredEditTier(tier: InPlaceEditTier) {
	if(typeof window === 'undefined') {
		return;
	}
	try {
		if(tier === 'off') {
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

export function EditableVendorsProvider({ children }: { children: ReactNode }) {
	const { user, loading: sessionLoading } = useSession();
	const [editableVendorIds, setEditableVendorIds] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const [ready, setReady] = useState(false);
	const [editTier, setEditTierState] = useState<InPlaceEditTier>('off');
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
			setEditTierState('off');
			writeStoredEditTier('off');
			setActiveCardId(null);
			setActiveFieldKey(null);
			setReady(true);
			return;
		}

		let cancelled = false;
		setReady(false);
		listMyVendors()
			.then((vendors) => {
				if(cancelled) {
					return;
				}
				const next = new Set(
					vendors
						.filter((vendor) => EDITOR_ROLES.has(vendor.myRole))
						.map((vendor) => vendor.id),
				);
				setEditableVendorIds(next);
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
	}, [sessionLoading, user]);

	const setEditTier = useCallback((tier: InPlaceEditTier) => {
		setEditTierState(tier);
		writeStoredEditTier(tier);
		if(tier !== 'card') {
			setActiveCardId(null);
		}
		if(tier !== 'element') {
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
		inPlaceEditActive: editTier !== 'off',
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
