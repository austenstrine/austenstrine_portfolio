'use strict';

/**
 * Ban user-facing "slug" jargon in JSX text / string children.
 * Prefer “web address” / “name in the link”.
 */
const SLUG_RE = /\bslugs?\b/i;

/** Prop names that are API/code identifiers, not UI copy. */
const ALLOWED_ATTRS = new Set([
	'className',
	'class',
	'id',
	'key',
	'name',
	'htmlFor',
	'href',
	'to',
	'src',
	'data-testid',
	'aria-labelledby',
	'aria-describedby',
]);

function reportIfSlug(context, node, value) {
	if(typeof value !== 'string' || !SLUG_RE.test(value)) {
		return;
	}
	context.report({
		node,
		messageId: 'noSlug',
	});
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow “slug” jargon in user-facing UI strings',
		},
		schema: [],
		messages: {
			noSlug: 'Do not use “slug” in user-facing UI copy. Prefer “web address” or “name in the link”.',
		},
	},
	create(context) {
		return {
			JSXText(node) {
				reportIfSlug(context, node, node.value);
			},
			Literal(node) {
				const parent = node.parent;
				if(!parent) {
					return;
				}
				if(parent.type === 'JSXExpressionContainer' || parent.type === 'JSXAttribute') {
					if(parent.type === 'JSXAttribute') {
						const name = parent.name && parent.name.name;
						if(typeof name === 'string' && ALLOWED_ATTRS.has(name)) {
							return;
						}
					}
					reportIfSlug(context, node, node.value);
					return;
				}
				// Template / concat used as JSX child
				if(
					parent.type === 'JSXElement'
					|| parent.type === 'JSXFragment'
				) {
					reportIfSlug(context, node, node.value);
				}
			},
			TemplateElement(node) {
				const parent = node.parent && node.parent.parent;
				if(!parent) {
					return;
				}
				if(
					parent.type === 'JSXExpressionContainer'
					|| parent.type === 'JSXAttribute'
					|| parent.type === 'JSXElement'
				) {
					reportIfSlug(context, node, node.value && node.value.raw);
				}
			},
		};
	},
};
