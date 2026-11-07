/** Mirrors real API gates (OWNER / EDITOR / VIEWER). Keep in sync with vendor-access + seller routes. */

export type VendorMemberRoleLabel = 'OWNER' | 'EDITOR' | 'VIEWER';

export const MEMBER_ROLE_LABEL: Record<VendorMemberRoleLabel, string> = {
	OWNER: 'Owner',
	EDITOR: 'Editor',
	VIEWER: 'Viewer',
};

export type MemberCapabilityRow = {
	id: string;
	label: string;
	owner: boolean;
	editor: boolean;
	viewer: boolean;
};

export const MEMBER_CAPABILITIES: MemberCapabilityRow[] = [
	{ id: 'view', label: 'Open seller pages', owner: true, editor: true, viewer: true },
	{ id: 'products', label: 'Edit products', owner: true, editor: true, viewer: false },
	{ id: 'orders', label: 'Fulfill and refund orders', owner: true, editor: true, viewer: false },
	{ id: 'invite', label: 'Invite teammates', owner: true, editor: true, viewer: false },
	{ id: 'members', label: 'Change role or remove', owner: true, editor: false, viewer: false },
	{ id: 'link', label: 'Change name in the link', owner: true, editor: false, viewer: false },
	{ id: 'passwords', label: 'App passwords', owner: true, editor: false, viewer: false },
	{ id: 'payouts', label: 'Payouts', owner: true, editor: false, viewer: false },
];
