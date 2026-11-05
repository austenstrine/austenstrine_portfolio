'use client';

import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';

type WidgetPrefsChromeValue = {
	altHeld: boolean;
};

const WidgetPrefsChromeContext = createContext<WidgetPrefsChromeValue>({
	altHeld: false,
});

function isEditableTarget(target: EventTarget | null) {
	if(!(target instanceof HTMLElement)) {
		return false;
	}
	const tag = target.tagName;
	if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
		return true;
	}
	return target.isContentEditable;
}

/**
 * Tracks Alt (Option) hold so collapsible widgets can reveal a ⋮ prefs menu
 * without CLS. Native context-menu extras are not available to ordinary pages.
 */
export function WidgetPrefsProvider({ children }: { children: ReactNode }) {
	const [altHeld, setAltHeld] = useState(false);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if(event.key !== 'Alt' && event.code !== 'AltLeft' && event.code !== 'AltRight') {
				return;
			}
			if(isEditableTarget(event.target)) {
				return;
			}
			setAltHeld(true);
		};
		const onKeyUp = (event: KeyboardEvent) => {
			if(event.key !== 'Alt' && event.code !== 'AltLeft' && event.code !== 'AltRight') {
				if(!event.altKey) {
					setAltHeld(false);
				}
				return;
			}
			setAltHeld(false);
		};
		const onBlur = () => setAltHeld(false);
		const onVisibility = () => {
			if(document.hidden) {
				setAltHeld(false);
			}
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, []);

	return (
		<WidgetPrefsChromeContext.Provider value={{ altHeld }}>
			{children}
		</WidgetPrefsChromeContext.Provider>
	);
}

export function useWidgetPrefsChrome() {
	return useContext(WidgetPrefsChromeContext);
}
