'use client';

import { useEffect, useState } from 'react';
import {
	getWidgetPref,
	widgetPrefsUserKey,
} from '../lib/widget-prefs';
import { useSession } from '../lib/useSession';

/**
 * Open/closed state for a collapsible widget, seeded from a remembered default
 * when one exists for the current user (or anon).
 */
export function useWidgetOpenState(
	widgetId: string,
	fallbackOpen = false,
) {
	const { user } = useSession();
	const userKey = widgetPrefsUserKey(user?.id);
	const [open, setOpen] = useState(fallbackOpen);

	useEffect(() => {
		const pref = getWidgetPref(userKey, widgetId);
		setOpen(
			pref
				? pref.open
				: fallbackOpen,
		);
	}, [fallbackOpen, userKey, widgetId]);

	return [open, setOpen] as const;
}
