'use strict';

/**
 * Directional UI must use ArrowLeftIcon / ArrowRightIcon — not caret/chevron/←→›.
 */
const BANNED_ICON = /^(Caret(Left|Right)|Chevron(Left|Right)|Arrow(Left|Right)?Caret)$/;
const BANNED_GLYPH = /[←→›]/;

function reportGlyph(context, node, text) {
	if(typeof text !== 'string') {
		return;
	}
	// Only lone glyph nodes (breadcrumbs etc.), not prose like "A → B".
	const trimmed = text.trim();
	if(!trimmed || !BANNED_GLYPH.test(trimmed) || trimmed.replace(/\s+/g, '').length > 1) {
		return;
	}
	if(!/^[←→›]$/.test(trimmed)) {
		return;
	}
	context.report({
		node,
		messageId: 'useArrowIcons',
	});
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Use ArrowLeftIcon/ArrowRightIcon for directional UI',
		},
		schema: [],
		messages: {
			useArrowIcons: 'Use ArrowLeftIcon / ArrowRightIcon for directional UI (no caret/chevron/←→›).',
			bannedIcon: 'Do not use {{name}} for directional UI. Prefer ArrowLeftIcon / ArrowRightIcon.',
		},
	},
	create(context) {
		return {
			JSXOpeningElement(node) {
				if(node.name.type !== 'JSXIdentifier') {
					return;
				}
				const name = node.name.name;
				if(BANNED_ICON.test(name)) {
					context.report({
						node,
						messageId: 'bannedIcon',
						data: {
							name,
						},
					});
				}
			},
			JSXText(node) {
				// Lone glyph text nodes only (e.g. breadcrumb ›). Skip Literals in expressions.
				reportGlyph(context, node, node.value);
			},
		};
	},
};
