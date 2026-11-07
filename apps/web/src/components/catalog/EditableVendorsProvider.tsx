'use client';

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { listMyVendors } from '../../lib/catalog-api';
import { useSession } from '../../lib/useSession';

const IN_PLACE_EDIT_STORAGE_KEY = 'pem:inplace-edit';

type EditableVendorsContextValue = {
	/** Vendor ids where the signed-in user is OWNER or EDITOR. */
	editableVendorIds: ReadonlySet<string>;
	canEditVendor: (vendorId: string | undefined | null) => boolean;
	ready: boolean;
	/**
	 * Opt-in field-level edit chrome on search/PDP. Off by default so sellers
	 * see buyer layout until they toggle (PEM-239).
	 */
	inPlaceEditActive: boolean;
	setInPlaceEditActive: (active: boolean) => void;
};

const EditableVendorsContext = createContext<EditableVendorsContextValue | null>(null);

const EDITOR_ROLES = new Set(['OWNER', 'EDITOR']);

function readStoredInPlaceEdit(): boolean {
	if(typeof window === 'undefined') {
		return false;
	}
	try {
		return window.sessionStorage.getItem(IN_PLACE_EDIT_STORAGE_KEY) === '1';
	}
	catch {
		return false;
	}
}

function writeStoredInPlaceEdit(active: boolean) {
	if(typeof window === 'undefined') {
		return;
	}
	try {
		if(active) {
			window.sessionStorage.setItem(IN_PLACE_EDIT_STORAGE_KEY, '1');
		}
		else {
			window.sessionStorage.removeItem(IN_PLACE_EDIT_STORAGE_KEY);
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
	const [inPlaceEditActive, setInPlaceEditActiveState] = useState(false);

	useEffect(() => {
		setInPlaceEditActiveState(readStoredInPlaceEdit());
	}, []);

	useEffect(() => {
		if(sessionLoading) {
			return;
		}
		if(!user) {
			setEditableVendorIds(new Set());
			setInPlaceEditActiveState(false);
			writeStoredInPlaceEdit(false);
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

	const value = useMemo<EditableVendorsContextValue>(() => ({
		editableVendorIds,
		canEditVendor: (vendorId) => Boolean(vendorId && editableVendorIds.has(vendorId)),
		ready,
		inPlaceEditActive,
		setInPlaceEditActive: (active) => {
			setInPlaceEditActiveState(active);
			writeStoredInPlaceEdit(active);
		},
	}), [editableVendorIds, ready, inPlaceEditActive]);

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
