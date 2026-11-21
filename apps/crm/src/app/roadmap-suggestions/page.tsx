'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApproveIcon } from '../../components/icons/ApproveIcon';
import { RejectIcon } from '../../components/icons/RejectIcon';
import { CrmShell } from '../../components/layout/CrmShell';
import { AuthApiError } from '../../lib/auth-api';
import {
	listRoadmapSuggestions,
	reviewRoadmapSuggestion,
	type RoadmapSuggestionQueueItem,
} from '../../lib/crm-api';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED';

function formatWhen(iso: string): string {
	const date = new Date(iso);
	if(Number.isNaN(date.getTime())) {
		return iso;
	}
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

export default function RoadmapSuggestionsPage() {
	const [status, setStatus] = useState<StatusFilter>('PENDING');
	const [items, setItems] = useState<RoadmapSuggestionQueueItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [rejectId, setRejectId] = useState<string | null>(null);

	const refresh = useCallback(async (nextStatus: StatusFilter) => {
		setLoading(true);
		setError(null);
		try {
			setItems(await listRoadmapSuggestions(nextStatus));
		}
		catch(loadError) {
			setItems([]);
			setError(
				loadError instanceof AuthApiError
					? loadError.message
					: 'Could not load suggestions.',
			);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh(status);
	}, [refresh, status]);

	async function onApprove(suggestionId: string) {
		setBusyId(suggestionId);
		setError(null);
		try {
			await reviewRoadmapSuggestion(suggestionId, { decision: 'approve' });
			setRejectId(null);
			await refresh(status);
		}
		catch(reviewError) {
			setError(
				reviewError instanceof AuthApiError
					? reviewError.message
					: 'Could not approve that suggestion.',
			);
		}
		finally {
			setBusyId(null);
		}
	}

	async function onRejectConfirm(suggestionId: string) {
		setBusyId(suggestionId);
		setError(null);
		try {
			await reviewRoadmapSuggestion(suggestionId, { decision: 'reject' });
			setRejectId(null);
			await refresh(status);
		}
		catch(reviewError) {
			setError(
				reviewError instanceof AuthApiError
					? reviewError.message
					: 'Could not reject that suggestion.',
			);
		}
		finally {
			setBusyId(null);
		}
	}

	const filters: { value: StatusFilter; label: string }[] = [
		{ value: 'PENDING', label: 'Pending' },
		{ value: 'APPROVED', label: 'Approved' },
		{ value: 'REJECTED', label: 'Rejected' },
	];

	return (
		<CrmShell>
			<div
				className="
					mx-auto
					max-w-3xl
				"
			>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
						text-white
					"
				>
					Suggestions
				</h1>

				<div
					className="
						mt-6
						flex
						flex-wrap
						gap-2
					"
					role="tablist"
					aria-label="Status"
				>
					{filters.map((filter) => {
						const active = status === filter.value;
						return (
							<button
								key={filter.value}
								type="button"
								role="tab"
								aria-selected={active}
								className={`
									rounded-lg
									px-3
									py-1.5
									text-sm
									font-semibold
									transition
									${active
										? 'bg-glow/20 text-glow'
										: 'border border-line text-mist/80 hover:text-mist'
									}
								`}
								onClick={() => {
									setRejectId(null);
									setStatus(filter.value);
								}}
							>
								{filter.label}
							</button>
						);
					})}
				</div>

				{error
					? (
							<p
								className="
									mt-4
									rounded-lg
									border
									border-warn/40
									bg-warn/10
									px-3
									py-2
									text-sm
									text-warn
								"
								role="alert"
							>
								{error}
							</p>
						)
					: null
				}

				{loading
					? (
							<p
								className="
									mt-8
									text-sm
									text-mist/60
								"
							>
								Loading…
							</p>
						)
					: null
				}

				{!loading && items.length === 0 && !error
					? (
							<p
								className="
									mt-8
									text-sm
									text-mist/60
								"
							>
								{status === 'PENDING'
									? 'No pending suggestions.'
									: status === 'APPROVED'
										? 'No approved suggestions.'
										: 'No rejected suggestions.'
								}
							</p>
						)
					: null
				}

				<ul
					className="
						mt-8
						flex
						flex-col
						gap-4
					"
				>
					{items.map((item) => {
						const metaBits = [
							item.name?.trim() || null,
							item.email?.trim() || null,
							item.userEmail && item.userEmail !== item.email
								? item.userEmail
								: null,
							formatWhen(item.createdAt),
						].filter(Boolean);

						return (
							<li
								key={item.id}
								className="
									rounded-xl
									border
									border-line
									bg-panel/70
									px-5
									py-4
								"
							>
								<p
									className="
										whitespace-pre-wrap
										text-sm
										leading-relaxed
										text-mist
									"
								>
									{item.body}
								</p>
								{metaBits.length > 0
									? (
											<p
												className="
													mt-3
													text-xs
													text-mist/55
												"
											>
												{metaBits.join(' · ')}
											</p>
										)
									: null
								}

								{status === 'PENDING'
									? (
											rejectId === item.id
												? (
														<div
															className="
																mt-4
																flex
																flex-wrap
																justify-end
																gap-2
															"
														>
															<button
																type="button"
																className="
																	inline-flex
																	min-h-11
																	items-center
																	justify-center
																	rounded-lg
																	border
																	border-line
																	px-4
																	text-sm
																	font-semibold
																	text-mist
																"
																onClick={() => setRejectId(null)}
															>
																Cancel
															</button>
															<button
																type="button"
																className="
																	inline-flex
																	min-h-11
																	items-center
																	justify-center
																	gap-2
																	rounded-lg
																	bg-warn
																	px-4
																	text-sm
																	font-semibold
																	text-rail
																	disabled:opacity-60
																"
																disabled={busyId === item.id}
																onClick={() => {
																	void onRejectConfirm(item.id);
																}}
															>
																<RejectIcon
																	className="
																		h-4
																		w-4
																	"
																/>
																<span>Confirm reject</span>
															</button>
														</div>
													)
												: (
														<div
															className="
																mt-4
																flex
																flex-wrap
																justify-end
																gap-2
															"
														>
															<button
																type="button"
																className="
																	inline-flex
																	min-h-11
																	items-center
																	justify-center
																	gap-2
																	rounded-lg
																	border
																	border-line
																	px-4
																	text-sm
																	font-semibold
																	text-mist
																	disabled:opacity-60
																"
																disabled={busyId === item.id}
																onClick={() => {
																	setRejectId(item.id);
																	setError(null);
																}}
															>
																<RejectIcon
																	className="
																		h-4
																		w-4
																	"
																/>
																<span>Reject</span>
															</button>
															<button
																type="button"
																className="
																	inline-flex
																	min-h-11
																	items-center
																	justify-center
																	gap-2
																	rounded-lg
																	bg-glow
																	px-4
																	text-sm
																	font-semibold
																	text-rail
																	disabled:opacity-60
																"
																disabled={busyId === item.id}
																onClick={() => {
																	void onApprove(item.id);
																}}
															>
																<ApproveIcon
																	className="
																		h-4
																		w-4
																	"
																/>
																<span>Approve</span>
															</button>
														</div>
													)
										)
									: null
								}
							</li>
						);
					})}
				</ul>
			</div>
		</CrmShell>
	);
}
