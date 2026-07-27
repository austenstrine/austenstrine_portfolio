"use client";

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { CurrentHighlightBody } from './CurrentHighlightCard';
import { CurrentHighlightCard } from './CurrentHighlightCard';
import {
	highlightTourActivateEvent,
	highlightTourClearEvent,
} from '../../lib/highlightTour';

type HighlightSectionWrapperProps = {
	featureIds: string[];
	bodyByFeatureId: Record<string, CurrentHighlightBody>;
	children: ReactNode;
};

export function HighlightSectionWrapper({
	featureIds,
	bodyByFeatureId,
	children,
}: HighlightSectionWrapperProps) {
	const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);

	const fallbackBody = useMemo(
		() => bodyByFeatureId[featureIds[0]],
		[bodyByFeatureId, featureIds],
	);

	const activeBody = activeFeatureId
		? bodyByFeatureId[activeFeatureId]
		: null;

	useEffect(() => {
		const onActivate = (event: Event) => {
			const customEvent = event as CustomEvent<{ featureId: string }>;
			const nextFeatureId = customEvent.detail.featureId;

			setActiveFeatureId(
				featureIds.includes(nextFeatureId)
					? nextFeatureId
					: null,
			);
		};

		const onClear = () => {
			setActiveFeatureId(null);
		};

		window.addEventListener(highlightTourActivateEvent, onActivate as EventListener);
		window.addEventListener(highlightTourClearEvent, onClear);

		return () => {
			window.removeEventListener(highlightTourActivateEvent, onActivate as EventListener);
			window.removeEventListener(highlightTourClearEvent, onClear);
		};
	}, [featureIds]);

	const clearHighlight = () => {
		window.dispatchEvent(new Event(highlightTourClearEvent));
	};

	return (
		<CurrentHighlightCard
			body={activeBody ?? fallbackBody}
			showWrapper={Boolean(activeBody)}
			onClose={activeBody ? clearHighlight : undefined}
		>
			{children}
		</CurrentHighlightCard>
	);
}
