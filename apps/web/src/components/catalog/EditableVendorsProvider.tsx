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

type EditableVendorsContextValue = {
	/** Vendor ids where the signed-in user is OWNER or EDITOR. */
	editableVendorIds: ReadonlySet<string>;
	canEditVendor: (vendorId: string | undefined | null) => boolean;
	ready: boolean;
};

const EditableVendorsContext = createContext<EditableVendorsContextValue | null>(null);

const EDITOR_ROLES = new Set(['OWNER', 'EDITOR']);

export function EditableVendorsProvider({ children }: { children: ReactNode }) {
	const { user, loading: sessionLoading } = useSession();
	const [editableVendorIds, setEditableVendorIds] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if(sessionLoading) {
			return;
		}
		if(!user) {
			setEditableVendorIds(new Set());
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
	}), [editableVendorIds, ready]);

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
