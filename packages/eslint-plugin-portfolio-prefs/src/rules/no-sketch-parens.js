'use strict';

/**
 * Ban literal UX-sketch strings like "(change >)" in UI copy.
 */
const SKETCH_RE = /\(\s*[\w][^)]*>\s*\)/;

function reportIfSketch(context, node, text) {
	if(typeof text !== 'string' || !SKETCH_RE.test(text)) {
		return;
	}
	context.report({
		node,
		messageId: 'noSketch',
	});
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow literal UX sketch strings like (change >) in UI',
		},
		schema: [],
		messages: {
			noSketch: 'Do not ship UX sketch strings like “(change >)”. Use proper site-styled action controls.',
		},
	},
	create(context) {
		return {
			JSXText(node) {
				reportIfSketch(context, node, node.value);
			},
			Literal(node) {
				const parent = node.parent;
				if(!parent) {
					return;
				}
				if(
					parent.type === 'JSXAttribute'
					|| parent.type === 'JSXExpressionContainer'
					|| parent.type === 'JSXElement'
				) {
					reportIfSketch(context, node, node.value);
				}
			},
		};
	},
};
