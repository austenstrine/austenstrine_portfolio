'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import {
	clearAllWidgetPrefs,
	forgetWidgetState,
	readWidgetPrefs,
	subscribeWidgetPrefs,
	widgetPrefsUserKey,
	type WidgetPrefsMap,
} from '../../../lib/widget-prefs';
import { useSession } from '../../../lib/useSession';

function WidgetPreferencesPanel() {
	const { user, loading } = useSession();
	const userKey = widgetPrefsUserKey(user?.id);
	const [prefs, setPrefs] = useState<WidgetPrefsMap>({});

	useEffect(() => {
		const sync = () => setPrefs(readWidgetPrefs(userKey));
		sync();
		return subscribeWidgetPrefs(userKey, sync);
	}, [userKey]);

	if(loading) {
		return (
			<p className="text-sm text-slate-500">
				Loading preferences…
			</p>
		);
	}

	const rows = Object.entries(prefs).sort((a, b) =>
		a[1].label.localeCompare(b[1].label),
	);

	return (
		<div
			className="
				mx-auto
				w-full
				max-w-xl
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-6
				shadow-sm
			"
		>
			<h1 className="text-2xl font-semibold text-ink">
				Widget preferences
			</h1>
			<p
				className="
					mt-2
					text-sm
					text-slate-600
				"
			>
				Remembered open or closed defaults for expandable sections.
				Use the ⋮ next to a section title (faint until you hover, focus,
				or hold Alt) to pin open or closed. Saved in this browser
				{user
					? ` for ${user.email}`
					: ' on this device'
				}
				.
			</p>

			{rows.length === 0
				? (
						<p
							className="
								mt-6
								rounded-xl
								border
								border-dashed
								border-slate-200
								bg-frost
								px-4
								py-6
								text-sm
								text-slate-600
							"
						>
							No remembered widget states yet.
						</p>
					)
				: (
						<ul
							className="
								mt-6
								flex
								flex-col
								gap-3
							"
						>
							{rows.map(([widgetId, pref]) => (
								<li
									className="
										flex
										flex-wrap
										items-center
										justify-between
										gap-3
										rounded-xl
										border
										border-slate-100
										px-4
										py-3
									"
									key={widgetId}
								>
									<div className="min-w-0">
										<p className="font-semibold text-ink">
											{pref.label}
										</p>
										<p className="text-xs text-slate-500">
											Default:
											{' '}
											{pref.open
												? 'open'
												: 'closed'
											}
										</p>
									</div>
									<button
										className="
											rounded-full
											border
											border-slate-200
											bg-white
											px-3
											py-1.5
											text-xs
											font-semibold
											text-slate-600
											transition
											hover:border-sky
											hover:text-sky
										"
										onClick={() =>
											forgetWidgetState(userKey, widgetId)
										}
										type="button"
									>
										Forget
									</button>
								</li>
							))}
						</ul>
					)
			}

			<div
				className="
					mt-6
					flex
					flex-wrap
					items-center
					justify-between
					gap-3
				"
			>
				<Link
					className="
						text-sm
						font-semibold
						text-sky
						hover:underline
					"
					href="/auth/account"
				>
					Back to account
				</Link>
				{rows.length > 0
					? (
							<button
								className="
									rounded-full
									border
									border-slate-200
									bg-white
									px-3
									py-1.5
									text-xs
									font-semibold
									text-slate-600
									transition
									hover:border-sky
									hover:text-sky
								"
								onClick={() => clearAllWidgetPrefs(userKey)}
								type="button"
							>
								Forget all
							</button>
						)
					: null
				}
			</div>
		</div>
	);
}

export default function WidgetPreferencesPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess reasonKey="account">
				<WidgetPreferencesPanel />
			</RequireAccess>
		</Suspense>
	);
}
