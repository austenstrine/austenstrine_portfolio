'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/api';
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

	if(!down) {
		return null;
	}

	return (
		<div
			className="
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
			role="status"
		>
			We&apos;re currently down. The site is up, but the API could not be reached. Try again in a moment.
		</div>
	);
}
