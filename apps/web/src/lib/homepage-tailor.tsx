'use client';

import {
	createContext,
	useContext,
	type ReactNode,
} from 'react';
import {
	DEFAULT_HOMEPAGE_TAILOR,
	resolveHomepageTailor,
	type HomepageTailorConfig,
} from '../data/for-targets';

const HomepageTailorContext = createContext<HomepageTailorConfig>(
	DEFAULT_HOMEPAGE_TAILOR,
);

export function HomepageTailorProvider({
	children,
	tailor,
}: {
	children: ReactNode;
	tailor?: Partial<HomepageTailorConfig> | null;
}) {
	const value = resolveHomepageTailor(tailor);
	return (
		<HomepageTailorContext.Provider value={value}>
			{children}
		</HomepageTailorContext.Provider>
	);
}

export function useHomepageTailor(): HomepageTailorConfig {
	return useContext(HomepageTailorContext);
}

export {
	DEFAULT_HOMEPAGE_TAILOR,
	resolveHomepageTailor,
	type HomepageTailorConfig,
};
