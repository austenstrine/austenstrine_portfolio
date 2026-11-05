'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrmShell } from '../../components/layout/CrmShell';
import { AuthApiError } from '../../lib/auth-api';
import {
	listVendorLinkNameRequests,
	reviewVendorLinkNameRequest,
	type VendorLinkNameQueueItem,
} from '../../lib/crm-api';

export default function LinkNamesPage() {
	const [items, setItems] = useState<VendorLinkNameQueueItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [denyId, setDenyId] = useState<string | null>(null);
	const [denyReason, setDenyReason] = useState('');

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setItems(await listVendorLinkNameRequests('PENDING'));
		}
		catch(loadError) {
			setItems([]);
			setError(
				loadError instanceof AuthApiError
					? loadError.message
					: 'Could not load link name requests.',
			);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	async function onApprove(requestId: string) {
		setBusyId(requestId);
		setError(null);
		try {
			await reviewVendorLinkNameRequest(requestId, { decision: 'approve' });
			await refresh();
		}
		catch(reviewError) {
			setError(
				reviewError instanceof AuthApiError
					? reviewError.message
					: 'Could not approve that request.',
			);
		}
		finally {
			setBusyId(null);
		}
	}

	async function onDenySubmit(requestId: string) {
		const reason = denyReason.trim();
		if(reason.length < 3) {
			setError('Give a plain-language reason when denying a request.');
			return;
		}
		setBusyId(requestId);
		setError(null);
		try {
			await reviewVendorLinkNameRequest(requestId, {
				decision: 'deny',
				reason,
			});
			setDenyId(null);
			setDenyReason('');
			await refresh();
		}
		catch(reviewError) {
			setError(
				reviewError instanceof AuthApiError
					? reviewError.message
					: 'Could not deny that request.',
			);
		}
		finally {
			setBusyId(null);
		}
	}

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
					Link name requests
				</h1>
				<p
					className="
						mt-3
						text-sm
						text-mist/75
					"
				>
					Approve or deny sellers who want a different name in their organization link.
				</p>

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
								Loading requests…
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
								No pending requests. When a seller asks to change the name in their
								organization link, Approve and Deny show up here.
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
					{items.map((request) => (
						<li
							key={request.id}
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
									font-semibold
									text-white
								"
							>
								{request.vendorName}
							</p>
							<p
								className="
									mt-1
									font-mono
									text-sm
									text-mist/80
								"
							>
								{request.currentSlug}
								{' → '}
								<span className="text-glow">
									{request.requestedSlug}
								</span>
							</p>
							{request.requesterNote
								? (
										<p
											className="
												mt-2
												text-sm
												text-mist/60
											"
										>
											Note: {request.requesterNote}
										</p>
									)
								: null
							}

							{denyId === request.id
								? (
										<div
											className="
												mt-4
												flex
												flex-col
												gap-3
											"
										>
											<label
												className="
													block
													text-sm
												"
											>
												<span className="font-medium text-mist">
													Reason for the seller
												</span>
												<textarea
													className="
														mt-1
														w-full
														rounded-lg
														border
														border-line
														bg-rail
														px-3
														py-2
														text-sm
														text-mist
													"
													rows={3}
													value={denyReason}
													onChange={(event) => setDenyReason(event.target.value)}
													placeholder="Too similar to another seller’s name in the link."
												/>
											</label>
											<div
												className="
													flex
													flex-wrap
													gap-2
												"
											>
												<button
													type="button"
													className="
														rounded-lg
														bg-warn
														px-4
														py-2
														text-sm
														font-semibold
														text-rail
														disabled:opacity-60
													"
													disabled={busyId === request.id}
													onClick={() => {
														void onDenySubmit(request.id);
													}}
												>
													Confirm deny
												</button>
												<button
													type="button"
													className="
														rounded-lg
														border
														border-line
														px-4
														py-2
														text-sm
														font-semibold
														text-mist
													"
													onClick={() => {
														setDenyId(null);
														setDenyReason('');
													}}
												>
													Cancel
												</button>
											</div>
										</div>
									)
								: (
										<div
											className="
												mt-4
												flex
												flex-wrap
												gap-2
											"
										>
											<button
												type="button"
												className="
													rounded-lg
													bg-glow
													px-4
													py-2
													text-sm
													font-semibold
													text-rail
													disabled:opacity-60
												"
												disabled={busyId === request.id}
												onClick={() => {
													void onApprove(request.id);
												}}
											>
												Approve
											</button>
											<button
												type="button"
												className="
													rounded-lg
													border
													border-line
													px-4
													py-2
													text-sm
													font-semibold
													text-mist
													disabled:opacity-60
												"
												disabled={busyId === request.id}
												onClick={() => {
													setDenyId(request.id);
													setDenyReason('');
													setError(null);
												}}
											>
												Deny
											</button>
										</div>
									)
							}
						</li>
					))}
				</ul>
			</div>
		</CrmShell>
	);
}
