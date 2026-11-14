'use strict';

/**
 * Single quotes in TS/JS expressions; JSX attributes keep double quotes.
 */
module.exports = {
	meta: {
		type: 'layout',
		docs: {
			description: 'Use single quotes in TS/JS; double quotes only for JSX attributes',
		},
		schema: [],
		fixable: false,
		messages: {
			useSingle: 'Use single quotes in TypeScript/JavaScript strings (JSX attributes may use double quotes).',
		},
	},
	create(context) {
		return {
			Literal(node) {
				if(typeof node.value !== 'string') {
					return;
				}
				const raw = node.raw || '';
				if(!raw.startsWith('"')) {
					return;
				}
				const parent = node.parent;
				if(parent && parent.type === 'JSXAttribute') {
					return;
				}
				// Allow strings that contain apostrophes (avoid ugly escapes)
				if(node.value.includes('\'')) {
					return;
				}
				context.report({
					node,
					messageId: 'useSingle',
				});
			},
		};
	},
};
