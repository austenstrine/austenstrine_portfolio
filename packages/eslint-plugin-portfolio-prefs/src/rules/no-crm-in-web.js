'use strict';

/**
 * Admin CRM stays in apps/crm — do not import CRM app modules into the web /
 * Place et Marque vendor UI (or vice versa via apps/web imports from apps/crm).
 */
function isWebPath(filename) {
	return /\/apps\/web\//.test(filename.replace(/\\/g, '/'));
}

function isCrmImport(source) {
	if(typeof source !== 'string') {
		return false;
	}
	const normalized = source.replace(/\\/g, '/');
	if(normalized === 'crm' || normalized.startsWith('crm/')) {
		return true;
	}
	if(/\/apps\/crm\//.test(normalized) || normalized.includes('apps/crm/')) {
		return true;
	}
	// Relative escape into sibling crm app
	if(/(^|\/)crm\/src\//.test(normalized) || /\/crm\/src\//.test(normalized)) {
		return true;
	}
	return false;
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Do not import apps/crm modules into apps/web',
		},
		schema: [],
		messages: {
			noCrmImport: 'CRM admin UI lives in apps/crm — do not import CRM modules into the Place et Marque web app.',
		},
	},
	create(context) {
		const filename = context.filename || context.getFilename();
		if(!isWebPath(filename)) {
			return {};
		}
		return {
			ImportDeclaration(node) {
				if(node.source && isCrmImport(node.source.value)) {
					context.report({
						node: node.source,
						messageId: 'noCrmImport',
					});
				}
			},
			CallExpression(node) {
				if(
					node.callee.type === 'Identifier'
					&& node.callee.name === 'require'
					&& node.arguments[0]
					&& node.arguments[0].type === 'Literal'
					&& isCrmImport(node.arguments[0].value)
				) {
					context.report({
						node: node.arguments[0],
						messageId: 'noCrmImport',
					});
				}
			},
		};
	},
};
