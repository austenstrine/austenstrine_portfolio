'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/api';
import { syncSiteTopBanners } from '../lib/site-top-banners';
import { apiTimeoutSignal } from '../lib/timed-fetch';

async function backendReachable(): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/health`, {
			cache: 'no-store',
			signal: apiTimeoutSignal(),
		});
		return response.ok;
	}
	catch {
		return false;
	}
}

/**
 * Joins the same fixed top-banner stack as PardonOurDustBanner
 * (`data-maintenance-banner` + CatalogHeader offset / `--site-top-banner-h`).
 * Same z-band as dust (z-40) — stacked by `top`, never over sticky catalog
 * chrome (z-30) or smothering dust copy.
 */
export function BackendDownBanner() {
	const [down, setDown] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const tick = async () => {
			const up = await backendReachable();
			if(!cancelled) {
				setDown(!up);
			}
		};
		void tick();
		const id = window.setInterval(() => {
			void tick();
		}, 10_000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, []);

	useLayoutEffect(() => {
		syncSiteTopBanners();
		return () => {
			// After unmount / hide, remeasure remaining banners (e.g. dust).
			queueMicrotask(() => {
				syncSiteTopBanners();
			});
		};
	}, [down]);

	if(!down) {
		return null;
	}

	return (
		<div
			className="
				fixed
				inset-x-0
				top-0
				z-40
				border-b
				border-amber-300
				bg-amber-50
				px-4
				py-3
				text-center
				text-sm
				font-medium
				text-amber-950
			"
			data-maintenance-banner=""
			role="status"
		>
			We&apos;re currently down. The site is up, but the API could not be reached. Try again in a moment.
		</div>
	);
}
