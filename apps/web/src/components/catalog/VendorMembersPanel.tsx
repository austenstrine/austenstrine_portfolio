'use client';

import { useState } from 'react';
import {
	createVendorInvite,
	listVendorInvites,
	removeVendorMember,
	revokeVendorInvite,
	updateVendorMemberRole,
	type VendorDetail,
	type VendorInviteSummary,
} from '../../lib/catalog-api';
import {
	MEMBER_CAPABILITIES,
	MEMBER_ROLE_LABEL,
	type VendorMemberRoleLabel,
} from '../../lib/vendor-member-capabilities';
import { CloseIcon } from '../icons/CloseIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

export type VendorMembersChange = {
	members: VendorDetail['members'];
	/** Present when the signed-in user's own role changed. */
	myRole?: VendorDetail['myRole'];
	/** True when the signed-in user removed themselves. */
	leftOrganization?: boolean;
};

type Props = {
	vendor: VendorDetail;
	viewerUserId?: string | null;
	invites: VendorInviteSummary[];
	onInvitesChange: (invites: VendorInviteSummary[]) => void;
	onMembersChange: (next: VendorMembersChange) => void;
};

function RoleMark({ allowed }: { allowed: boolean }) {
	return (
		<span
			className={
				allowed
					? 'text-slate-800'
					: 'text-slate-300'
			}
			aria-label={allowed ? 'Yes' : 'No'}
		>
			{allowed
				? '✓'
				: '·'}
		</span>
	);
}

export function VendorMembersPanel({
	vendor,
	viewerUserId,
	invites,
	onInvitesChange,
	onMembersChange,
}: Props) {
	const canInvite = vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR';
	const canManageMembers = vendor.myRole === 'OWNER';
	const ownerCount = vendor.members.filter((member) => member.role === 'OWNER').length;
	const [inviteOpen, setInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
	const [inviteBusy, setInviteBusy] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);
	const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
	const [memberError, setMemberError] = useState<string | null>(null);

	const refreshInvites = async () => {
		onInvitesChange(await listVendorInvites(vendor.id));
	};

	const emitMembers = (
		members: VendorDetail['members'],
		extra?: Omit<VendorMembersChange, 'members'>,
	) => {
		onMembersChange({ members, ...extra });
	};

	const patchMember = (
		userId: string,
		next: Partial<VendorDetail['members'][number]>,
	) => {
		const members = vendor.members.map((member) =>
			member.userId === userId
				? { ...member, ...next }
				: member,
		);
		const selfRole =
			viewerUserId
			&& userId === viewerUserId
			&& next.role
				? { myRole: next.role }
				: undefined;
		emitMembers(members, selfRole);
	};

	return (
		<div className="mt-4 flex flex-col gap-5">
			<div className="overflow-x-auto">
				<table className="w-full min-w-[20rem] border-collapse text-left text-sm">
					<caption className="sr-only">
						What each role can do
					</caption>
					<thead>
						<tr className="border-b border-slate-200 text-xs text-slate-500">
							<th className="py-2 pr-3 font-medium" scope="col">
								Access
							</th>
							<th className="px-2 py-2 text-center font-medium" scope="col">
								Owner
							</th>
							<th className="px-2 py-2 text-center font-medium" scope="col">
								Editor
							</th>
							<th className="px-2 py-2 text-center font-medium" scope="col">
								Viewer
							</th>
						</tr>
					</thead>
					<tbody>
						{MEMBER_CAPABILITIES.map((row) => (
							<tr
								key={row.id}
								className="border-b border-slate-100"
							>
								<th
									className="py-2 pr-3 font-normal text-slate-700"
									scope="row"
								>
									{row.label}
								</th>
								<td className="px-2 py-2 text-center">
									<RoleMark allowed={row.owner} />
								</td>
								<td className="px-2 py-2 text-center">
									<RoleMark allowed={row.editor} />
								</td>
								<td className="px-2 py-2 text-center">
									<RoleMark allowed={row.viewer} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<ul className="flex flex-col">
				{vendor.members.map((member) => {
					const roleLabel = MEMBER_ROLE_LABEL[member.role as VendorMemberRoleLabel]
						?? member.role;
					const busy = memberBusyId === member.userId;
					const isSoleOwner = member.role === 'OWNER' && ownerCount <= 1;
					// Role select is EDITOR↔VIEWER only — no Owner demote without a promote path.
					const canEditRow = canManageMembers
						&& (member.role === 'EDITOR' || member.role === 'VIEWER');
					const canRemoveRow = canManageMembers && !isSoleOwner;

					return (
						<li
							key={member.userId}
							className="
								flex
								flex-wrap
								items-center
								justify-between
								gap-2
								border-b
								border-slate-100
								py-2.5
							"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-slate-900">
									{member.email}
								</p>
								<p className="text-xs text-slate-500">
									Joined {new Date(member.joinedAt).toLocaleDateString()}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{canEditRow
									? (
											<select
												className="
													rounded-md
													border
													border-slate-200
													bg-white
													px-2
													py-1
													text-xs
													font-medium
													text-slate-700
												"
												aria-label={`Role for ${member.email}`}
												disabled={busy}
												value={member.role}
												onChange={(event) => {
													const nextRole = event.target.value as 'EDITOR' | 'VIEWER';
													if(nextRole !== 'EDITOR' && nextRole !== 'VIEWER') {
														return;
													}
													setMemberBusyId(member.userId);
													setMemberError(null);
													const previous = member.role;
													patchMember(member.userId, { role: nextRole });
													updateVendorMemberRole(
														vendor.id,
														member.userId,
														nextRole,
													)
														.then((updated) => {
															patchMember(member.userId, {
																role: updated.role,
															});
														})
														.catch((err) => {
															patchMember(member.userId, {
																role: previous,
															});
															setMemberError(
																err instanceof Error
																	? err.message
																	: 'Could not change role.',
															);
														})
														.finally(() => setMemberBusyId(null));
												}}
											>
												<option value="EDITOR">
													Editor
												</option>
												<option value="VIEWER">
													Viewer
												</option>
											</select>
										)
									: (
											<span className="text-xs font-medium text-slate-600">
												{roleLabel}
											</span>
										)
								}
								{canRemoveRow
									? (
											<button
												type="button"
												aria-label={`Remove ${member.email}`}
												disabled={busy}
												className="
													inline-flex
													h-8
													w-8
													items-center
													justify-center
													rounded-full
													border
													border-slate-200
													text-slate-500
													transition
													hover:border-red-300
													hover:text-red-700
													disabled:opacity-50
												"
												onClick={() => {
													setMemberBusyId(member.userId);
													setMemberError(null);
													removeVendorMember(vendor.id, member.userId)
														.then(() => {
															const members = vendor.members.filter(
																(row) => row.userId !== member.userId,
															);
															emitMembers(members, {
																leftOrganization: Boolean(
																	viewerUserId
																	&& member.userId === viewerUserId,
																),
															});
														})
														.catch((err) => {
															setMemberError(
																err instanceof Error
																	? err.message
																	: 'Could not remove member.',
															);
														})
														.finally(() => setMemberBusyId(null));
												}}
											>
												<TrashIcon className="h-3.5 w-3.5" />
											</button>
										)
									: null
								}
							</div>
						</li>
					);
				})}

				{canInvite
					? invites.map((invite) => (
							<li
								key={invite.id}
								className="
									flex
									flex-wrap
									items-center
									justify-between
									gap-2
									border-b
									border-dashed
									border-slate-200
									py-2.5
									text-sm
								"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-slate-900">
										{invite.email}
									</p>
									<p className="text-xs text-slate-500">
										Pending · {MEMBER_ROLE_LABEL[invite.role as VendorMemberRoleLabel] ?? invite.role}
										{' · '}
										expires {new Date(invite.expiresAt).toLocaleDateString()}
									</p>
								</div>
								<button
									type="button"
									aria-label={`Revoke invite for ${invite.email}`}
									className="
										inline-flex
										h-8
										items-center
										gap-1.5
										rounded-full
										border
										border-slate-200
										px-2.5
										text-xs
										font-semibold
										text-red-700
										transition
										hover:border-red-300
										sm:px-3
									"
									onClick={() => {
										revokeVendorInvite(vendor.id, invite.id)
											.then(refreshInvites)
											.catch(() => undefined);
									}}
								>
									<span className="hidden sm:inline">
										Revoke
									</span>
									<CloseIcon className="h-3 w-3 sm:hidden" />
								</button>
							</li>
						))
					: null
				}

				{canInvite
					? (
							<li
								className={
									inviteOpen
										? 'border-b border-slate-100 py-3'
										: 'flex justify-end py-2'
								}
							>
								{inviteOpen
									? (
											<div className="flex w-full flex-col gap-3">
												<div className="flex items-center justify-between gap-2">
													<p className="text-sm font-semibold">
														Invite
													</p>
													<button
														type="button"
														aria-expanded={true}
														aria-label="Close invite form"
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
														onClick={() => {
															setInviteOpen(false);
															setInviteError(null);
														}}
													>
														<CloseIcon className="h-3 w-3 shrink-0" />
														<span className="hidden sm:inline">
															Cancel
														</span>
													</button>
												</div>
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
														setInviteBusy(true);
														setInviteError(null);
														createVendorInvite(vendor.id, {
															email: inviteEmail.trim(),
															role: inviteRole,
														})
															.then(async () => {
																setInviteEmail('');
																setInviteOpen(false);
																await refreshInvites();
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
													<label className="block flex-1 text-sm">
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
															onChange={(event) =>
																setInviteEmail(event.target.value)
															}
															placeholder="teammate@example.com"
														/>
													</label>
													<label className="block text-sm md:w-40">
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
																setInviteRole(
																	event.target.value as 'EDITOR' | 'VIEWER',
																)
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
															: 'Send invite'}
													</button>
												</form>
												{inviteError
													? (
															<p className="text-sm text-red-700">
																{inviteError}
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
													sm:py-1.5
												"
												onClick={() => setInviteOpen(true)}
											>
												<PlusIcon className="h-3.5 w-3.5 shrink-0" />
												<span className="hidden sm:inline">
													Invite
												</span>
											</button>
										)
								}
							</li>
						)
					: null
				}
			</ul>

			{memberError
				? (
						<p className="text-sm text-red-700">
							{memberError}
						</p>
					)
				: null
			}
		</div>
	);
}
