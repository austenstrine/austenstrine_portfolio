'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import {
	createVendorAppPassword,
	createVendorInvite,
	getMyVendor,
	listVendorAppPasswords,
	listVendorInvites,
	requestVendorLinkName,
	revokeVendorAppPassword,
	revokeVendorInvite,
	type CreatedVendorAppPassword,
	type VendorAppPassword,
	type VendorDetail,
	type VendorInviteSummary,
} from '../../../../lib/catalog-api';
import {
	createVendorConnectAccountLink,
	formatMoney,
	getVendorConnectStatus,
	listVendorShippingProfiles,
	upsertVendorShippingProfile,
	type ConnectStatus,
	type ShippingProfile,
} from '../../../../lib/checkout-api';
import { useSession } from '../../../../lib/useSession';
import { RequireAccess } from '../../../../components/auth/RequireAccess';
import { UrlSlugField } from '../../../../components/catalog/UrlSlugField';
import { ArrowRightIcon } from '../../../../components/icons/ArrowRightIcon';
import { CartIcon } from '../../../../components/icons/CartIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { DocumentIcon } from '../../../../components/icons/DocumentIcon';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { PlusIcon } from '../../../../components/icons/PlusIcon';

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

/** Live input: keep a trailing `-` so Space is not eaten before the next word. */
function slugifyTyping(value: string): string {
	const lower = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-');
	const keepTrailing = lower.endsWith('-');
	const body = lower.replace(/^-+|-+$/g, '');
	if(!body) {
		return '';
	}
	const next = keepTrailing
		? `${body}-`
		: body;
	return next.slice(0, 80);
}

function formatPayoutStatus(status: string): string {
	switch(status) {
		case 'PENDING':
			return 'Pending';
		case 'READY':
			return 'Ready';
		case 'TRANSFERRED':
			return 'Paid out';
		case 'FAILED':
			return 'Failed';
		case 'CANCELLED':
			return 'Cancelled';
		case 'SKIPPED':
			return 'Skipped';
		case 'REVERSED':
			return 'Reversed';
		default:
			return status.charAt(0) + status.slice(1).toLowerCase();
	}
}

function formatPayoutTrigger(trigger: string): string {
	if(trigger === 'ON_SHIPMENT') {
		return 'Pays out when shipped';
	}
	if(trigger === 'ON_PAYMENT') {
		return 'Pays out when paid';
	}
	return trigger.replace(/_/g, ' ').toLowerCase();
}

function VendorDetailContent() {
	const params = useParams<{ vendorId: string }>();
	const searchParams = useSearchParams();
	const router = useRouter();
	const vendorRef = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [vendor, setVendor] = useState<VendorDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [linkNameDraft, setLinkNameDraft] = useState('');
	const [linkNameNote, setLinkNameNote] = useState('');
	const [linkNameBusy, setLinkNameBusy] = useState(false);
	const [linkNameError, setLinkNameError] = useState<string | null>(null);
	const [linkNameMessage, setLinkNameMessage] = useState<string | null>(null);
	const [linkNameOpen, setLinkNameOpen] = useState(false);
	const [passwords, setPasswords] = useState<VendorAppPassword[]>([]);
	const [passwordName, setPasswordName] = useState('Inventory sync');
	const [createdToken, setCreatedToken] = useState<CreatedVendorAppPassword | null>(null);
	const [passwordBusy, setPasswordBusy] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [appPasswordsOpen, setAppPasswordsOpen] = useState(false);
	const [invites, setInvites] = useState<VendorInviteSummary[]>([]);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
	const [inviteBusy, setInviteBusy] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);
	const [inviteMessage, setInviteMessage] = useState<string | null>(null);
	const [inviteOpen, setInviteOpen] = useState(false);
	const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);
	const [shippingBusy, setShippingBusy] = useState(false);
	const [shippingError, setShippingError] = useState<string | null>(null);
	const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
	const [connectBusy, setConnectBusy] = useState(false);
	const [connectError, setConnectError] = useState<string | null>(null);
	const [connectBanner, setConnectBanner] = useState<string | null>(null);

	useEffect(() => {
		const connectParam = searchParams.get('connect');
		if(connectParam === 'return') {
			setConnectBanner('Stripe onboarding returned. Refreshing payout status.');
		}
		else if(connectParam === 'refresh') {
			setConnectBanner('Stripe link expired. Continue setup when ready.');
		}
	}, [searchParams]);

	useEffect(() => {
		if(!user || !vendorRef) {
			setLoading(false);
			return;
		}

		setLoading(true);
		getMyVendor(vendorRef)
			.then(async (detail) => {
				setVendor(detail);
				setLinkNameDraft(detail.slug);
				if(detail.resolvedFromId && detail.slug !== vendorRef) {
					const qs = searchParams.toString();
					router.replace(
						`/place-et-marque/vendors/${detail.slug}${qs
							? `?${qs}`
							: ''
						}`,
					);
				}
				const vendorId = detail.id;
				if(detail.myRole === 'OWNER' || detail.myRole === 'EDITOR') {
					try {
						setShippingProfiles(await listVendorShippingProfiles(vendorId));
					}
					catch {
						setShippingProfiles([]);
					}
					try {
						setInvites(await listVendorInvites(vendorId));
					}
					catch {
						setInvites([]);
					}
				}
				if(detail.myRole === 'OWNER') {
					try {
						setPasswords(await listVendorAppPasswords(vendorId));
					}
					catch {
						setPasswords([]);
					}
					try {
						setConnectStatus(await getVendorConnectStatus(vendorId));
					}
					catch {
						setConnectStatus(null);
					}
				}
			})
			.catch((loadError) => {
				setVendor(null);
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load vendor organization.',
				);
			})
			.finally(() => setLoading(false));
	}, [user, vendorRef, router, searchParams]);

	const vendorId = vendor?.id;

	async function onRequestLinkName(event: FormEvent) {
		event.preventDefault();
		if(!vendorId) {
			return;
		}
		const linkName = slugify(linkNameDraft);
		if(linkName.length < 2) {
			setLinkNameError('Use at least two letters or numbers in the name.');
			return;
		}
		setLinkNameDraft(linkName);
		setLinkNameBusy(true);
		setLinkNameError(null);
		setLinkNameMessage(null);
		try {
			const result = await requestVendorLinkName(vendorId, {
				linkName,
				note: linkNameNote.trim() || undefined,
			});
			setLinkNameMessage(result.message);
			const refreshed = await getMyVendor(vendor?.slug || vendorId);
			setVendor(refreshed);
			setLinkNameDraft(refreshed.slug);
		}
		catch(requestError) {
			setLinkNameError(
				requestError instanceof Error
					? requestError.message
					: 'Could not send that request.',
			);
		}
		finally {
			setLinkNameBusy(false);
		}
	}

	async function onEnsureFreight() {
		if(!vendorId) {
			return;
		}
		setShippingBusy(true);
		setShippingError(null);
		try {
			await upsertVendorShippingProfile(vendorId, {
				code: 'FREIGHT',
				name: 'Freight',
				shipsSeparately: true,
				payoutTrigger: 'ON_SHIPMENT',
				rates: [{ label: 'Freight pallet', amountCents: 14900 }],
			});
			await upsertVendorShippingProfile(vendorId, {
				code: 'STANDARD',
				name: 'Standard',
				shipsSeparately: false,
				payoutTrigger: 'ON_PAYMENT',
				rates: [{ label: 'Ground', amountCents: 999 }],
			});
			setShippingProfiles(await listVendorShippingProfiles(vendorId));
		}
		catch(ensureError) {
			setShippingError(
				ensureError instanceof Error
					? ensureError.message
					: 'Could not update shipping profiles.',
			);
		}
		finally {
			setShippingBusy(false);
		}
	}

	async function onContinueStripeSetup() {
		if(!vendorId) {
			return;
		}
		setConnectBusy(true);
		setConnectError(null);
		try {
			const link = await createVendorConnectAccountLink(vendorId);
			window.location.href = link.url;
		}
		catch(setupError) {
			setConnectError(
				setupError instanceof Error
					? setupError.message
					: 'Could not start Stripe Connect onboarding.',
			);
			setConnectBusy(false);
		}
	}

	async function onCreatePassword() {
		if(!vendorId) {
			return;
		}
		setPasswordBusy(true);
		setPasswordError(null);
		try {
			const created = await createVendorAppPassword(vendorId, passwordName);
			setCreatedToken(created);
			setPasswords(await listVendorAppPasswords(vendorId));
		}
		catch(createError) {
			setPasswordError(
				createError instanceof Error
					? createError.message
					: 'Could not create app password.',
			);
		}
		finally {
			setPasswordBusy(false);
		}
	}

	async function onRevokePassword(passwordId: string) {
		if(!vendorId) {
			return;
		}
		setPasswordBusy(true);
		setPasswordError(null);
		try {
			await revokeVendorAppPassword(vendorId, passwordId);
			setPasswords(await listVendorAppPasswords(vendorId));
		}
		catch(revokeError) {
			setPasswordError(
				revokeError instanceof Error
					? revokeError.message
					: 'Could not revoke app password.',
			);
		}
		finally {
			setPasswordBusy(false);
		}
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<nav
				aria-label="Breadcrumb"
				className="
					text-sm
					text-slate-500
				"
			>
				<ol
					className="
						flex
						flex-wrap
						items-center
						gap-2
					"
				>
					<li>
						<a
							className="
								font-semibold
								text-sky
								hover:underline
							"
							href="/place-et-marque/vendors"
						>
							Vendors
						</a>
					</li>
					<li aria-hidden="true">
						›
					</li>
					<li
						className="
							font-semibold
							text-ink
						"
					>
						{vendor?.name ?? 'Organization'}
					</li>
				</ol>
			</nav>

			{sessionLoading || loading
				? (
					<p className="text-sm text-slate-500">
						Loading…
					</p>
				)
				: null
			}

			{error
				? (
					<p className="text-sm text-red-700">
						{error}
					</p>
				)
				: null
			}

			{vendor
				? (
					<>
						<div>
							<p
								className="
									text-xs
									font-semibold
									uppercase
									tracking-wide
									text-slate-500
								"
							>
								{vendor.myRole}
							</p>
							<h1
								className="
									mt-1
									text-3xl
									font-semibold
									tracking-tight
								"
							>
								{vendor.name}
							</h1>
							{vendor.myRole === 'OWNER'
								? (
										<div
											className="
												mt-2
												overflow-hidden
												rounded-2xl
												border
												border-slate-200
												bg-white
											"
										>
											<div
												className="
													flex
													items-center
													justify-between
													gap-2
													px-3
													py-2
												"
											>
												<p
													className="
														min-w-0
														flex-1
														truncate
														text-left
														text-slate-600
													"
												>
													/place-et-marque/vendors/{vendor.slug}
												</p>
												<div
													className="
														flex
														shrink-0
														items-center
														gap-2
													"
												>
													{!linkNameOpen
														&& vendor.linkNameRequest?.status === 'PENDING'
														? (
																<span
																	className="
																		hidden
																		text-sm
																		text-slate-500
																		sm:inline
																	"
																>
																	Pending review
																</span>
															)
														: null
													}
													{!linkNameOpen
														? (
																<button
																	type="button"
																	onClick={() => setLinkNameOpen(true)}
																	aria-expanded={false}
																	aria-label="Change link name"
																	className="
																		inline-flex
																		h-8
																		w-8
																		items-center
																		justify-center
																		gap-1.5
																		rounded-full
																		border
																		border-slate-200
																		bg-white
																		text-xs
																		font-semibold
																		text-slate-600
																		transition
																		hover:border-sky
																		hover:text-sky
																		sm:h-auto
																		sm:w-auto
																		sm:px-3
																		sm:py-1
																	"
																>
																	<span
																		className="
																			hidden
																			sm:inline
																		"
																	>
																		Change link name
																	</span>
																	<ArrowRightIcon
																		className="
																			h-3
																			w-3
																			shrink-0
																		"
																	/>
																</button>
															)
														: (
																<button
																	type="button"
																	onClick={() => setLinkNameOpen(false)}
																	aria-expanded={true}
																	aria-label="Close link name form"
																	className="
																		inline-flex
																		h-8
																		w-8
																		items-center
																		justify-center
																		gap-1.5
																		rounded-full
																		border
																		border-slate-200
																		bg-white
																		text-xs
																		font-semibold
																		text-slate-600
																		transition
																		hover:border-sky
																		hover:text-sky
																		sm:h-auto
																		sm:w-auto
																		sm:px-3
																		sm:py-1
																	"
																>
																	<CloseIcon
																		className="
																			h-3
																			w-3
																			shrink-0
																		"
																	/>
																	<span
																		className="
																			hidden
																			sm:inline
																		"
																	>
																		Close
																	</span>
																</button>
															)
													}
												</div>
											</div>
											{!linkNameOpen
												&& vendor.linkNameRequest?.status === 'PENDING'
												? (
														<p
															className="
																px-3
																pb-2
																text-sm
																text-slate-500
																sm:hidden
															"
														>
															Pending review
														</p>
													)
												: null
											}
											<div
												className={`
													grid
													transition-[grid-template-rows]
													duration-300
													ease-out
													${linkNameOpen
														? 'grid-rows-[1fr] opacity-100'
														: 'grid-rows-[0fr] opacity-0'
													}
												`}
												aria-hidden={!linkNameOpen}
												{...(!linkNameOpen
													? { inert: true }
													: {})
												}
											>
												<div className="overflow-hidden">
													<section
														className="
															border-t
															border-slate-100
															px-5
															pb-5
															pt-4
														"
													>
														<h2 className="text-lg font-semibold">
															Name in the link
														</h2>
														<p
															className="
																mt-2
																text-sm
																text-slate-600
															"
														>
															This short name appears in your organization page and store address.
															Changing it later needs Place et Marque approval.
														</p>
														{vendor.linkNameRequest?.status === 'PENDING'
															? (
																	<p
																		className="
																			mt-3
																			rounded-xl
																			border
																			border-sky/30
																			bg-sky/5
																			px-4
																			py-3
																			text-sm
																			text-slate-700
																		"
																	>
																		Pending request:
																		{' '}
																		<strong>
																			{vendor.linkNameRequest.requestedSlug}
																		</strong>
																		. We&apos;ll email or show the decision here when reviewed.
																	</p>
																)
															: null
														}
														{vendor.linkNameRequest?.status === 'DENIED'
															? (
																	<p
																		className="
																			mt-3
																			rounded-xl
																			border
																			border-red-200
																			bg-red-50
																			px-4
																			py-3
																			text-sm
																			text-red-800
																		"
																	>
																		Last request denied
																		{vendor.linkNameRequest.reviewReason
																			? `: ${vendor.linkNameRequest.reviewReason}`
																			: '.'
																		}
																	</p>
																)
															: null
														}
														<form
															className="
																mt-4
																flex
																flex-col
																gap-3
															"
															noValidate
															onSubmit={onRequestLinkName}
														>
															<UrlSlugField
																label="Requested name in the link"
																value={linkNameDraft}
																onChange={(next) => setLinkNameDraft(slugifyTyping(next))}
																prefixPath="/place-et-marque/vendors"
																placeholder={vendor.slug}
																helpText="Ask for a different name if the current one no longer fits."
															/>
															<label className="block text-sm">
																<span className="font-semibold">
																	Note for reviewers (optional)
																</span>
																<textarea
																	className="
																		mt-1
																		w-full
																		rounded-lg
																		border
																		border-slate-300
																		px-3
																		py-2
																	"
																	rows={3}
																	value={linkNameNote}
																	onChange={(event) => setLinkNameNote(event.target.value)}
																	maxLength={500}
																	placeholder="Why this name works better"
																/>
															</label>
															{linkNameError
																? (
																		<p className="text-sm text-red-700">
																			{linkNameError}
																		</p>
																	)
																: null
															}
															{linkNameMessage
																? (
																		<p className="text-sm text-asgreen">
																			{linkNameMessage}
																		</p>
																	)
																: null
															}
															<button
																type="submit"
																disabled={
																	linkNameBusy
																	|| slugify(linkNameDraft) === vendor.slug
																	|| vendor.linkNameRequest?.status === 'PENDING'
																}
																className="
																	self-end
																	rounded-full
																	bg-sky
																	px-4
																	py-2.5
																	text-sm
																	font-semibold
																	text-white
																	disabled:opacity-60
																"
															>
																{linkNameBusy
																	? 'Sending…'
																	: 'Request new name'
																}
															</button>
														</form>
													</section>
												</div>
											</div>
										</div>
									)
								: (
										<p
											className="
												mt-1
												text-slate-600
											"
										>
											/place-et-marque/vendors/{vendor.slug}
										</p>
									)
							}
						</div>

						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<h2 className="text-lg font-semibold">
								Members
							</h2>
							<ul
								className="
									mt-4
									flex
									flex-col
									gap-3
								"
							>
								{vendor.members.map((member) => (
									<li
										className="
											flex
											flex-wrap
											items-center
											justify-between
											gap-2
											rounded-xl
											border
											border-slate-100
											p-3
										"
										key={member.userId}
									>
										<div>
											<p className="font-semibold">
												{member.email}
											</p>
											<p className="text-xs text-slate-500">
												Joined {new Date(member.joinedAt).toLocaleDateString()}
											</p>
										</div>
										<span
											className="
												rounded-full
												bg-slate-100
												px-3
												py-1
												text-xs
												font-semibold
												uppercase
												tracking-wide
												text-slate-700
											"
										>
											{member.role}
										</span>
									</li>
								))}
								{(vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR')
									&& invites.map((invite) => (
										<li
											className="
												flex
												flex-wrap
												items-center
												justify-between
												gap-2
												rounded-xl
												border
												border-dashed
												border-slate-200
												p-3
												text-sm
											"
											key={invite.id}
										>
											<div>
												<p className="font-semibold">
													{invite.email}
												</p>
												<p className="text-xs text-slate-500">
													Invite pending · {invite.role} · expires{' '}
													{new Date(invite.expiresAt).toLocaleDateString()}
												</p>
											</div>
											<button
												className="
													text-xs
													font-semibold
													uppercase
													tracking-wide
													text-red-700
													hover:underline
												"
												type="button"
												onClick={() => {
													if(!vendorId) {
														return;
													}
													revokeVendorInvite(vendorId, invite.id)
														.then(async () => {
															setInvites(await listVendorInvites(vendorId));
														})
														.catch(() => undefined);
												}}
											>
												Revoke
											</button>
										</li>
									))
								}
								{vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR'
									? (
											<li
												className={
													inviteOpen
														? `
															rounded-xl
															border
															border-slate-100
															p-3
														`
														: `
															flex
															justify-end
														`
												}
											>
												{inviteOpen
													? (
															<div
																className="
																	flex
																	w-full
																	flex-col
																	gap-3
																"
															>
																<div
																	className="
																		flex
																		items-center
																		justify-between
																		gap-2
																	"
																>
																	<p
																		className="
																			text-sm
																			font-semibold
																		"
																	>
																		Invite a teammate
																	</p>
																	<button
																		type="button"
																		aria-expanded={true}
																		aria-label="Close invite form"
																		className="
																			inline-flex
																			items-center
																			gap-1.5
																			rounded-full
																			border
																			border-slate-200
																			bg-white
																			px-3
																			py-1
																			text-xs
																			font-semibold
																			text-slate-600
																			transition
																			hover:border-sky
																			hover:text-sky
																		"
																		onClick={() => {
																			setInviteOpen(false);
																			setInviteError(null);
																			setInviteMessage(null);
																		}}
																	>
																		<CloseIcon
																			className="
																				h-3
																				w-3
																			"
																		/>
																		Cancel
																	</button>
																</div>
																<p
																	className="
																		text-sm
																		text-slate-600
																	"
																>
																	Send an email invite so teammates can join this organization.
																</p>
																<form
																	className="
																		flex
																		flex-col
																		gap-3
																		md:flex-row
																		md:items-end
																	"
																	onSubmit={(event) => {
																		event.preventDefault();
																		if(!vendorId) {
																			return;
																		}
																		setInviteBusy(true);
																		setInviteError(null);
																		setInviteMessage(null);
																		createVendorInvite(vendorId, {
																			email: inviteEmail.trim(),
																			role: inviteRole,
																		})
																			.then(async () => {
																				setInviteEmail('');
																				setInviteMessage('Invite sent.');
																				setInvites(await listVendorInvites(vendorId));
																			})
																			.catch((inviteErr) => {
																				setInviteError(
																					inviteErr instanceof Error
																						? inviteErr.message
																						: 'Could not send invite.',
																				);
																			})
																			.finally(() => setInviteBusy(false));
																	}}
																>
																	<label
																		className="
																			block
																			flex-1
																			text-sm
																		"
																	>
																		<span className="font-semibold">
																			Email
																		</span>
																		<input
																			className="
																				mt-1
																				w-full
																				rounded-lg
																				border
																				border-slate-300
																				px-3
																				py-2
																			"
																			type="email"
																			required
																			value={inviteEmail}
																			onChange={(event) => setInviteEmail(event.target.value)}
																			placeholder="teammate@example.com"
																		/>
																	</label>
																	<label
																		className="
																			block
																			text-sm
																			md:w-40
																		"
																	>
																		<span className="font-semibold">
																			Role
																		</span>
																		<select
																			className="
																				mt-1
																				w-full
																				rounded-lg
																				border
																				border-slate-300
																				px-3
																				py-2
																			"
																			value={inviteRole}
																			onChange={(event) =>
																				setInviteRole(event.target.value as 'EDITOR' | 'VIEWER')
																			}
																		>
																			<option value="EDITOR">
																				Editor
																			</option>
																			<option value="VIEWER">
																				Viewer
																			</option>
																		</select>
																	</label>
																	<button
																		className="
																			rounded-full
																			bg-sky
																			px-4
																			py-2.5
																			text-sm
																			font-semibold
																			text-white
																			hover:bg-sky/90
																			disabled:opacity-60
																		"
																		type="submit"
																		disabled={inviteBusy}
																	>
																		{inviteBusy
																			? 'Sending…'
																			: 'Send invite'
																		}
																	</button>
																</form>
																{inviteError
																	? (
																			<p
																				className="
																					text-sm
																					text-red-700
																				"
																			>
																				{inviteError}
																			</p>
																		)
																	: null
																}
																{inviteMessage
																	? (
																			<p
																				className="
																					text-sm
																					text-emerald-700
																				"
																			>
																				{inviteMessage}
																			</p>
																		)
																	: null
																}
															</div>
														)
													: (
															<button
																type="button"
																aria-label="Invite members"
																aria-expanded={false}
																className="
																	inline-flex
																	items-center
																	justify-center
																	gap-1.5
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
																onClick={() => setInviteOpen(true)}
															>
																<PlusIcon
																	className="
																		h-3.5
																		w-3.5
																	"
																/>
																Invite
															</button>
														)
												}
											</li>
										)
									: null
								}
							</ul>
						</section>

						{vendor.myRole === 'OWNER'
							? (
								<section
									className="
										rounded-2xl
										border
										border-slate-200
										bg-white
										p-5
									"
								>
									<h2 className="text-lg font-semibold">
										Payouts
									</h2>
									<p
										className="
											mt-2
											text-sm
											text-slate-600
										"
									>
										Stripe Connect Express receives merchandise minus platform fee,
										plus shipping. Freight / ships-separately orders pay out when marked shipped.
									</p>

									{connectBanner
										? (
											<p
												className="
													mt-3
													rounded-xl
													border
													border-sky/30
													bg-sky/5
													px-3
													py-2
													text-sm
													text-slate-700
												"
											>
												{connectBanner}
											</p>
										)
										: null
									}

									{connectError
										? (
											<p
												className="
													mt-3
													text-sm
													text-red-700
												"
											>
												{connectError}
											</p>
										)
										: null
									}

									{connectStatus
										? (
											<div
												className="
													mt-4
													flex
													flex-col
													gap-3
												"
											>
												<div
													className="
														flex
														flex-wrap
														gap-2
													"
												>
													<span
														className="
															rounded-full
															bg-slate-100
															px-3
															py-1
															text-xs
															font-semibold
															uppercase
															tracking-wide
															text-slate-700
														"
													>
														{connectStatus.canReceivePayouts
															? 'Payouts enabled'
															: connectStatus.detailsSubmitted
																? 'Review pending'
																: 'Setup incomplete'
														}
													</span>
													{connectStatus.chargesEnabled
														? (
															<span
																className="
																	rounded-full
																	bg-emerald-50
																	px-3
																	py-1
																	text-xs
																	font-semibold
																	uppercase
																	tracking-wide
																	text-emerald-800
																"
															>
																Charges on
															</span>
														)
														: null
													}
													{(connectStatus.pendingCount ?? 0) > 0
														? (
															<span
																className="
																	rounded-full
																	bg-amber-50
																	px-3
																	py-1
																	text-xs
																	font-semibold
																	uppercase
																	tracking-wide
																	text-amber-900
																"
															>
																{connectStatus.pendingCount} queued
															</span>
														)
														: null
													}
												</div>

												{connectStatus.accountId
													? (
														<p className="text-xs text-slate-500">
															Account {connectStatus.accountId}
														</p>
													)
													: (
														<p className="text-sm text-slate-600">
															No Stripe account yet. Buyers can still check out;
															your net is ledgered until onboarding finishes.
														</p>
													)
												}

												{connectStatus.lastError
													? (
														<p className="text-sm text-red-700">
															Last transfer error: {connectStatus.lastError}
														</p>
													)
													: null
												}

												<button
													className="
														inline-flex
														w-fit
														items-center
														rounded-xl
														bg-sky
														px-4
														py-2
														text-sm
														font-semibold
														text-white
														disabled:opacity-60
													"
													disabled={connectBusy}
													onClick={() => void onContinueStripeSetup()}
													type="button"
												>
													{connectBusy
														? 'Opening Stripe…'
														: connectStatus.canReceivePayouts
															? 'Update Stripe details'
															: 'Continue Stripe setup'
													}
												</button>

												{(connectStatus.recent?.length ?? 0) > 0
													? (
														<ul
															className="
																mt-2
																flex
																flex-col
																gap-2
																border-t
																border-slate-100
																pt-3
															"
														>
															{connectStatus.recent!.map((row) => {
																const orderedAt = row.orderCreatedAt ?? row.createdAt;
																const whenLabel = row.transferredAt
																	? `Paid ${new Date(row.transferredAt).toLocaleString()}`
																	: row.shippedAt
																		? `Ordered ${new Date(orderedAt).toLocaleString()} · shipped ${new Date(row.shippedAt).toLocaleString()}`
																		: `Ordered ${new Date(orderedAt).toLocaleString()}`;
																const orderLabel = row.orderRef || row.orderId;
																return (
																	<li
																		className="
																			flex
																			flex-wrap
																			items-start
																			justify-between
																			gap-3
																			rounded-xl
																			border
																			border-slate-100
																			px-3
																			py-2.5
																			text-sm
																		"
																		key={row.id}
																	>
																		<div className="min-w-0 flex-1">
																			<p className="font-semibold text-ink">
																				<a
																					className="
																						text-sky
																						hover:underline
																					"
																					href={`/place-et-marque/vendors/${vendor.slug}/orders#${encodeURIComponent(row.orderId)}`}
																				>
																					{orderLabel}
																				</a>
																				{' '}
																				<span
																					className="
																						font-normal
																						text-slate-500
																					"
																				>
																					· {formatPayoutStatus(row.status)}
																				</span>
																			</p>
																			{row.customerHint || row.productHint
																				? (
																						<p className="mt-0.5 text-slate-600">
																							{[row.customerHint, row.productHint]
																								.filter(Boolean)
																								.join(' · ')
																							}
																						</p>
																					)
																				: null
																			}
																			<p className="mt-0.5 text-xs text-slate-500">
																				{formatPayoutTrigger(row.trigger)}
																				{' · '}
																				{whenLabel}
																			</p>
																			{row.lastError
																				? (
																						<p className="mt-1 text-xs text-red-700">
																							{row.lastError}
																						</p>
																					)
																				: null
																			}
																		</div>
																		<span
																			className="
																				shrink-0
																				text-right
																				font-semibold
																			"
																		>
																			{formatMoney(row.vendorNetCents)}
																			{' '}
																			<span className="font-normal text-slate-500">
																				(fee {formatMoney(row.feeCents)})
																			</span>
																		</span>
																	</li>
																);
															})}
														</ul>
													)
													: null
												}
											</div>
										)
										: (
											<p
												className="
													mt-3
													text-sm
													text-slate-500
												"
											>
												Could not load payout status.
											</p>
										)
									}
								</section>
							)
							: null
						}

						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<h2 className="text-lg font-semibold">
								Catalog
							</h2>
							<p
								className="
									mt-2
									text-sm
									text-slate-600
								"
							>
								{vendor.productCount} product
								{vendor.productCount === 1
									? ''
									: 's'
								} in this organization.
							</p>
							<nav
								aria-label="Catalog pages"
								className="
									mt-3
									flex
									flex-col
									gap-1
								"
							>
								{(vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR')
									? (
										<a
											className="
												inline-flex
												items-center
												gap-2
												rounded-full
												px-3
												py-2
												text-sm
												font-semibold
												text-sky
												transition
												hover:bg-sky/5
											"
											href={`/place-et-marque/products/new?vendorId=${encodeURIComponent(vendor.id)}`}
										>
											<PlusIcon
												className="
													h-4
													w-4
													shrink-0
												"
											/>
											<span className="min-w-0 flex-1 text-left">
												New product
											</span>
											<ArrowRightIcon
												className="
													h-3.5
													w-3.5
													shrink-0
												"
											/>
										</a>
									)
									: null
								}
								<a
									className="
										inline-flex
										items-center
										gap-2
										rounded-full
										px-3
										py-2
										text-sm
										font-semibold
										text-sky
										transition
										hover:bg-sky/5
									"
									href={`/place-et-marque/search?vendor=${encodeURIComponent(vendor.slug)}`}
								>
									<EyeIcon
										className="
											h-4
											w-4
											shrink-0
										"
									/>
									<span className="min-w-0 flex-1 text-left">
										View products
									</span>
									<ArrowRightIcon
										className="
											h-3.5
											w-3.5
											shrink-0
										"
									/>
								</a>
								<a
									className="
										inline-flex
										items-center
										gap-2
										rounded-full
										px-3
										py-2
										text-sm
										font-semibold
										text-sky
										transition
										hover:bg-sky/5
									"
									href={`/place-et-marque/vendors/${vendor.slug}/import`}
								>
									<DocumentIcon
										className="
											h-4
											w-4
											shrink-0
										"
									/>
									<span className="min-w-0 flex-1 text-left">
										Bulk CSV import
									</span>
									<ArrowRightIcon
										className="
											h-3.5
											w-3.5
											shrink-0
										"
									/>
								</a>
								<a
									className="
										inline-flex
										items-center
										gap-2
										rounded-full
										px-3
										py-2
										text-sm
										font-semibold
										text-sky
										transition
										hover:bg-sky/5
									"
									href={`/place-et-marque/vendors/${vendor.slug}/orders`}
								>
									<CartIcon
										className="
											h-4
											w-4
											shrink-0
										"
									/>
									<span className="min-w-0 flex-1 text-left">
										Orders to fulfill
									</span>
									<ArrowRightIcon
										className="
											h-3.5
											w-3.5
											shrink-0
										"
									/>
								</a>
							</nav>
						</section>

						{vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR'
							? (
								<section
									className="
										rounded-2xl
										border
										border-slate-200
										bg-white
										p-5
									"
								>
									<h2 className="text-lg font-semibold">
										Shipping profiles
									</h2>
									<p
										className="
											mt-2
											text-sm
											text-slate-600
										"
									>
										Checkout groups items by shipping profile. Use Freight for
										pallet / separate-shipment orders; Standard for everyday ground.
										Add the defaults below if this vendor has none yet.
									</p>
									{shippingError
										? (
											<p
												className="
													mt-3
													text-sm
													text-red-700
												"
											>
												{shippingError}
											</p>
										)
										: null
									}
									<ul
										className="
											mt-4
											flex
											flex-col
											gap-3
										"
									>
										{shippingProfiles.map((profile) => (
											<li
												className="
													rounded-xl
													border
													border-slate-100
													p-3
												"
												key={profile.id}
											>
												<p className="font-semibold">
													{profile.name}
													{profile.shipsSeparately
														? ' · ships separately'
														: ''
													}
													{profile.payoutTrigger === 'ON_SHIPMENT'
														? ' · payout when shipped'
														: ' · payout when paid'
													}
												</p>
												<p className="text-sm text-slate-600">
													{profile.rates
														.map(
															(rate) =>
																`${rate.label} (${formatMoney(rate.amountCents)})`,
														)
														.join(' · ') || 'No rates yet'}
												</p>
											</li>
										))}
									</ul>
									{shippingProfiles.length === 0
										? (
											<p
												className="
													mt-3
													text-sm
													text-slate-500
												"
											>
												No profiles yet. Add Standard and Freight to unlock checkout
												shipping for this vendor.
											</p>
										)
										: null
									}
									<div
										className="
											mt-4
											flex
											justify-end
										"
									>
										<button
											className="
												rounded-full
												border
												border-slate-300
												px-4
												py-2
												text-sm
												font-semibold
												text-slate-700
												hover:border-sky
												hover:text-sky
												disabled:opacity-60
											"
											type="button"
											disabled={shippingBusy}
											onClick={() => void onEnsureFreight()}
										>
											{shippingBusy
												? 'Saving…'
												: (
													shippingProfiles.length === 0
														? 'Add Standard and Freight defaults'
														: 'Refresh Standard and Freight defaults'
												)
											}
										</button>
									</div>
								</section>
							)
							: null
						}

						{vendor.myRole === 'OWNER'
							? (
								<section
									className="
										rounded-2xl
										border
										border-slate-200
										bg-white
										p-5
									"
									id="app-passwords"
								>
									<div
										className="
											flex
											items-center
											justify-between
											gap-2
										"
									>
										<h2 className="text-lg font-semibold">
											App passwords
										</h2>
										{appPasswordsOpen
											? (
													<button
														type="button"
														aria-expanded={true}
														aria-controls="app-passwords-panel"
														aria-label="Close app passwords"
														className="
															inline-flex
															h-8
															w-8
															shrink-0
															items-center
															justify-center
															gap-1.5
															rounded-full
															border
															border-slate-200
															bg-white
															text-xs
															font-semibold
															text-slate-600
															transition
															hover:border-sky
															hover:text-sky
															sm:h-auto
															sm:w-auto
															sm:px-3
															sm:py-1
														"
														onClick={() => setAppPasswordsOpen(false)}
													>
														<CloseIcon
															className="
																h-3
																w-3
																shrink-0
															"
														/>
														<span
															className="
																hidden
																sm:inline
															"
														>
															Close
														</span>
													</button>
												)
											: (
													<button
														type="button"
														aria-expanded={false}
														aria-controls="app-passwords-panel"
														aria-label="Manage app passwords"
														className="
															inline-flex
															h-8
															w-8
															items-center
															justify-center
															gap-1.5
															rounded-full
															border
															border-slate-200
															bg-white
															text-xs
															font-semibold
															text-slate-600
															transition
															hover:border-sky
															hover:text-sky
															sm:h-auto
															sm:w-auto
															sm:px-3
															sm:py-1
														"
														onClick={() => setAppPasswordsOpen(true)}
													>
														<span
															className="
																hidden
																sm:inline
															"
														>
															Manage app passwords
														</span>
														<ArrowRightIcon
															className="
																h-3
																w-3
																shrink-0
															"
														/>
													</button>
												)
										}
									</div>
									<div
										className={`
											grid
											transition-[grid-template-rows]
											duration-300
											ease-out
											${appPasswordsOpen
												? 'grid-rows-[1fr] opacity-100'
												: 'grid-rows-[0fr] opacity-0'
											}
										`}
										id="app-passwords-panel"
										aria-hidden={!appPasswordsOpen}
										{...(!appPasswordsOpen
											? { inert: true }
											: {})
										}
									>
										<div className="overflow-hidden">
											<p
												className="
													mt-2
													text-sm
													text-slate-600
												"
											>
												Create a vendor-scoped token for your developers or servers.
												They can validate and commit CSV imports against the API
												without signing in as a person. Copy the token once when it is
												created, then hand it off securely.
											</p>

											{passwordError
												? (
													<p
														className="
															mt-3
															text-sm
															text-red-700
														"
													>
														{passwordError}
													</p>
												)
												: null
											}

											{createdToken
												? (
													<div
														className="
															mt-4
															rounded-xl
															border
															border-amber-200
															bg-amber-50
															p-4
														"
													>
														<p
															className="
																text-sm
																font-semibold
																text-amber-900
															"
														>
															{createdToken.warning}
														</p>
														<code
															className="
																mt-2
																block
																break-all
																rounded-lg
																bg-white
																px-3
																py-2
																font-mono
																text-xs
																text-ink
															"
														>
															{createdToken.token}
														</code>
														<button
															className="
																mt-3
																text-sm
																font-semibold
																text-sky
																hover:underline
															"
															type="button"
															onClick={() =>
																void navigator.clipboard.writeText(
																createdToken.token,
																)
																}
														>
															Copy token
														</button>
													</div>
												)
												: null
											}

											<div
												className="
													mt-4
													flex
													flex-wrap
													items-end
													gap-3
												"
											>
												<label className="text-sm">
													<span className="font-semibold">
														Name
													</span>
													<input
														className="
															mt-1
															block
															rounded-lg
															border
															border-slate-300
															px-3
															py-2
														"
														value={passwordName}
														onChange={(event) =>
															setPasswordName(event.target.value)
														}
													/>
												</label>
												<button
													className="
														rounded-full
														bg-sky
														px-4
														py-2.5
														text-sm
														font-semibold
														text-white
														hover:bg-sky/90
														disabled:opacity-60
													"
													type="button"
													disabled={passwordBusy || !passwordName.trim()}
													onClick={() => void onCreatePassword()}
												>
													Create app password
												</button>
											</div>

											<ul
												className="
													mt-4
													flex
													flex-col
													gap-3
												"
											>
												{passwords.length === 0
													? (
														<li className="text-sm text-slate-500">
															No app passwords yet.
														</li>
													)
													: null
												}
												{passwords.map((row) => (
													<li
														className="
															flex
															flex-wrap
															items-center
															justify-between
															gap-2
															rounded-xl
															border
															border-slate-100
															p-3
														"
														key={row.id}
													>
														<div>
															<p className="font-semibold">
																{row.name}
															</p>
															<p className="text-xs text-slate-500">
																{row.hint}
																{row.active
																	? ''
																	: ' · revoked'
																}
																{row.lastUsedAt
																	? ` · last used ${new Date(row.lastUsedAt).toLocaleString()}`
																	: ''
																}
															</p>
														</div>
														{row.active
															? (
																<button
																	className="
																		text-sm
																		font-semibold
																		text-red-700
																		hover:underline
																		disabled:opacity-60
																	"
																	type="button"
																	disabled={passwordBusy}
																	onClick={() =>
																		void onRevokePassword(row.id)
																		}
																>
																	Revoke
																</button>
															)
															: null
														}
													</li>
												))}
											</ul>

											<pre
												className="
													mt-4
													overflow-x-auto
													rounded-xl
													bg-sky
													p-4
													font-mono
													text-xs
													text-frost
												"
											>
{`curl -X POST \\
  "$API/catalog/vendors/${vendor.id}/imports/validate" \\
  -H "Authorization: Bearer vas_…" \\
  -H "Content-Type: application/json" \\
  -d '{"csv":"…","source":"API"}'`}
											</pre>
										</div>
									</div>
								</section>
							)
							: null
						}
					</>
				)
				: null
			}
		</div>
	);
}

export default function VendorDetailPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess
				vendorRequired
				reasonKey="vendorDetail"
			>
				<VendorDetailContent />
			</RequireAccess>
		</Suspense>
	);
}
