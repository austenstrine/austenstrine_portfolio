'use strict';

/**
 * Section gutters use Tailwind `gutter` — do not pile max-[399px]:px-* for that job.
 * Button px-* step-downs are allowed (attr on button/Button or data-pem-allow-micromobile-px).
 */
const PILE_RE = /\bmax-\[399px\]:px-/;

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

function getAttr(node, name) {
	return (node.attributes || []).find((attr) => (
		attr.type === 'JSXAttribute'
		&& attr.name
		&& attr.name.type === 'JSXIdentifier'
		&& attr.name.name === name
	));
}

function elementName(node) {
	if(!node || node.name.type !== 'JSXIdentifier') {
		return '';
	}
	return node.name.name;
}

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Do not pile max-[399px]:px-* for section gutters; use gutter token',
		},
		schema: [],
		messages: {
			useGutter: 'Use the `gutter` token for section padding. Do not pile max-[399px]:px-* (button step-downs OK).',
		},
	},
	create(context) {
		return {
			JSXOpeningElement(node) {
				if(getAttr(node, 'data-pem-allow-micromobile-px')) {
					return;
				}
				const name = elementName(node);
				if(name === 'button' || /Button$/.test(name)) {
					return;
				}
				const classAttr = getAttr(node, 'className') || getAttr(node, 'class');
				const classes = classNameFromAttr(classAttr);
				if(PILE_RE.test(classes)) {
					context.report({
						node: classAttr || node,
						messageId: 'useGutter',
					});
				}
			},
		};
	},
};
