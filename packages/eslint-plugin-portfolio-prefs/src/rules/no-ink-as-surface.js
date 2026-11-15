'use strict';

/**
 * ink (#0d1b2a) is body text only — never a selected fill or dark surface.
 * Flags fill/gradient utilities (bg/from/to/via). Border/ring accents are out of scope.
 */
const INK_SURFACE_RE = /(^|[\s:])(bg-ink|from-ink|to-ink|via-ink)(\/|\s|$)/;

function classNameFromAttr(attr) {
	if(!attr || !attr.value) {
		return '';
	}
	if(attr.value.type === 'Literal') {
		return String(attr.value.value || '');
	}
	if(attr.value.type === 'JSXExpressionContainer') {
		const expr = attr.value.expression;
		if(expr.type === 'Literal') {
			return String(expr.value || '');
		}
		if(expr.type === 'TemplateLiteral') {
			return expr.quasis.map((q) => q.value.cooked || '').join(' ');
		}
	}
	return '';
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Do not use ink as a fill/surface; ink is body text only',
		},
		schema: [],
		messages: {
			noInkSurface: 'ink is body text only — do not use it as a selected fill or dark surface (use sky/navy chrome instead).',
		},
	},
	create(context) {
		return {
			JSXAttribute(node) {
				if(!node.name || (node.name.name !== 'className' && node.name.name !== 'class')) {
					return;
				}
				const classes = classNameFromAttr(node);
				if(INK_SURFACE_RE.test(classes)) {
					context.report({
						node,
						messageId: 'noInkSurface',
					});
				}
			},
		};
	},
};
