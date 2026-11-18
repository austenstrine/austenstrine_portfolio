'use strict';

/**
 * Authenticated account *subpages* (password, etc.) must use RequireAccess.
 * The account hub itself is guest-visible with a soft CTA (PEM-510) — do not
 * require a hard gate on `/auth/account/page.tsx`.
 */
function isGatedAccountSubpage(filename) {
	const normalized = filename.replace(/\\/g, '/');
	// Nested under account/…/page — not the hub page itself.
	return /\/app\/place-et-marque\/auth\/account\/.+\/page\.(tsx|jsx|ts|js)$/i.test(normalized);
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Authenticated account subpages must wrap content in RequireAccess (hub may be ungated)',
		},
		schema: [],
		messages: {
			needRequireAccess:
				'Authenticated account subpages must use RequireAccess so guests cannot reach gated actions.',
		},
	},
	create(context) {
		const filename = context.filename || context.getFilename();
		if(!isGatedAccountSubpage(filename)) {
			return {};
		}
		let sawRequireAccess = false;
		return {
			Identifier(node) {
				if(node.name === 'RequireAccess') {
					sawRequireAccess = true;
				}
			},
			'Program:exit'(node) {
				if(!sawRequireAccess) {
					context.report({
						node,
						messageId: 'needRequireAccess',
					});
				}
			},
		};
	},
};
