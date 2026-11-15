'use strict';

/**
 * Directional glyphs / unnamed caret-chevron components are banned.
 * Use portfolio icons: ArrowLeft/Right (navigate), ChevronLeft/RightIcon (in-place de-drill/drill).
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
			description:
				'Use ArrowLeft/RightIcon or ChevronLeft/RightIcon — not raw caret/chevron/←→›',
		},
		schema: [],
		messages: {
			useArrowIcons:
				'Use ArrowLeftIcon / ArrowRightIcon / ChevronLeftIcon / ChevronRightIcon (no raw ←→›).',
			bannedIcon:
				'Do not use {{name}}. Prefer Arrow*Icon (navigate) or Chevron*Icon (in-place drill).',
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
