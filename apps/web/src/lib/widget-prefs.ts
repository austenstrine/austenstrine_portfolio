/** Browser-local open/closed defaults for optionally collapsible widgets. */

export type WidgetPref = {
	open: boolean;
	label: string;
	updatedAt: number;
};

export type WidgetPrefsMap = Record<string, WidgetPref>;

const STORAGE_PREFIX = 'pem.widgetPrefs.v1';
const CHANGE_EVENT = 'pem:widget-prefs-change';

function storageKey(userKey: string) {
	return `${STORAGE_PREFIX}:${userKey}`;
}

export function widgetPrefsUserKey(userId: string | null | undefined) {
	return userId && userId.length > 0
		? `user:${userId}`
		: 'anon';
}

function emitChange(userKey: string) {
	if(typeof window === 'undefined') {
		return;
	}
	window.dispatchEvent(
		new CustomEvent(CHANGE_EVENT, {
			detail: { userKey },
		}),
	);
}

export function readWidgetPrefs(userKey: string): WidgetPrefsMap {
	if(typeof window === 'undefined') {
		return {};
	}
	try {
		const raw = window.localStorage.getItem(storageKey(userKey));
		if(!raw) {
			return {};
		}
		const parsed = JSON.parse(raw) as unknown;
		if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}
		const next: WidgetPrefsMap = {};
		for(const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
			if(!value || typeof value !== 'object' || Array.isArray(value)) {
				continue;
			}
			const row = value as Partial<WidgetPref>;
			if(typeof row.open !== 'boolean') {
				continue;
			}
			next[id] = {
				open: row.open,
				label:
					typeof row.label === 'string' && row.label.trim()
						? row.label.trim()
						: id,
				updatedAt:
					typeof row.updatedAt === 'number'
						? row.updatedAt
						: 0,
			};
		}
		return next;
	}
	catch {
		return {};
	}
}

export function getWidgetPref(
	userKey: string,
	widgetId: string,
): WidgetPref | null {
	return readWidgetPrefs(userKey)[widgetId] ?? null;
}

export function rememberWidgetState(
	userKey: string,
	widgetId: string,
	open: boolean,
	label: string,
) {
	const prefs = readWidgetPrefs(userKey);
	prefs[widgetId] = {
		open,
		label: label.trim() || widgetId,
		updatedAt: Date.now(),
	};
	window.localStorage.setItem(storageKey(userKey), JSON.stringify(prefs));
	emitChange(userKey);
}

export function forgetWidgetState(userKey: string, widgetId: string) {
	const prefs = readWidgetPrefs(userKey);
	if(!(widgetId in prefs)) {
		return;
	}
	delete prefs[widgetId];
	if(Object.keys(prefs).length === 0) {
		window.localStorage.removeItem(storageKey(userKey));
	}
	else {
		window.localStorage.setItem(storageKey(userKey), JSON.stringify(prefs));
	}
	emitChange(userKey);
}

export function clearAllWidgetPrefs(userKey: string) {
	window.localStorage.removeItem(storageKey(userKey));
	emitChange(userKey);
}

export function subscribeWidgetPrefs(
	userKey: string,
	onChange: () => void,
) {
	if(typeof window === 'undefined') {
		return () => undefined;
	}

	const onStorage = (event: StorageEvent) => {
		if(event.key === storageKey(userKey) || event.key === null) {
			onChange();
		}
	};
	const onLocal = (event: Event) => {
		const detail = (event as CustomEvent<{ userKey?: string }>).detail;
		if(!detail?.userKey || detail.userKey === userKey) {
			onChange();
		}
	};

	window.addEventListener('storage', onStorage);
	window.addEventListener(CHANGE_EVENT, onLocal);
	return () => {
		window.removeEventListener('storage', onStorage);
		window.removeEventListener(CHANGE_EVENT, onLocal);
	};
}
