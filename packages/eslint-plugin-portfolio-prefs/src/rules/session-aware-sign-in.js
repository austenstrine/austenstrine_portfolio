'use strict';

/**
 * Account hub surfaces must use RequireAccess (session-aware; guests never see
 * bare Sign in on /auth/account*).
 */
function isAccountHubPage(filename) {
	const normalized = filename.replace(/\\/g, '/');
	// Layouts/metadata files are not the hub surface — only page.tsx.
	return /\/app\/auth\/account\/(?:.*\/)?page\.(tsx|jsx|ts|js)$/i.test(normalized);
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Account hub pages must wrap content in RequireAccess',
		},
		schema: [],
		messages: {
			needRequireAccess: 'Account hub pages must use RequireAccess so Sign in language stays session-aware.',
		},
	},
	create(context) {
		const filename = context.filename || context.getFilename();
		if(!isAccountHubPage(filename)) {
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
