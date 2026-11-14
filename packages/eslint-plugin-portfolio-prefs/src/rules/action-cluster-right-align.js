'use strict';

/**
 * Action / CTA clusters marked data-pem-actions must be right-aligned
 * (justify-end or ml-auto), not justify-start alone.
 */
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
			return expr.quasis.map((q) => q.value.cooked || '').join('');
		}
	}
	return '';
}

function getAttr(node, name) {
	return (node.attributes || []).find((attr) => (
		attr.type === 'JSXAttribute'
		&& attr.name
		&& attr.name.type === 'JSXIdentifier'
		&& attr.name.name === name
	));
}

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'data-pem-actions clusters should be right-aligned',
		},
		schema: [],
		messages: {
			needRightAlign: 'Action clusters (data-pem-actions) should use justify-end or ml-auto, not justify-start alone.',
		},
	},
	create(context) {
		return {
			JSXOpeningElement(node) {
				const marker = getAttr(node, 'data-pem-actions');
				if(!marker) {
					return;
				}
				const classAttr = getAttr(node, 'className') || getAttr(node, 'class');
				const classes = classNameFromAttr(classAttr);
				const hasRight = /\bjustify-end\b/.test(classes) || /\bml-auto\b/.test(classes);
				const hasStart = /\bjustify-start\b/.test(classes);
				if(hasStart || !hasRight) {
					context.report({
						node: marker,
						messageId: 'needRightAlign',
					});
				}
			},
		};
	},
};
