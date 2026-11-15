'use strict';

/**
 * CV preference: never list The King and I.
 */
const KING_RE = /\bthe\s+king\s+and\s+i\b|\bking\s+and\s+i\b/i;

function isCvPath(filename) {
	const normalized = filename.replace(/\\/g, '/');
	return (
		/\/cv\//i.test(normalized)
		|| /CvDocument/i.test(normalized)
		|| /\/experience\//i.test(normalized)
	);
}

function reportIfMatch(context, node, text) {
	if(typeof text !== 'string' || !KING_RE.test(text)) {
		return;
	}
	context.report({
		node,
		messageId: 'noKingAndI',
	});
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow listing The King and I on CV / experience surfaces',
		},
		schema: [],
		messages: {
			noKingAndI: 'Do not list “The King and I” on the CV or experience pages.',
		},
	},
	create(context) {
		const filename = context.filename || context.getFilename();
		if(!isCvPath(filename)) {
			return {};
		}
		return {
			JSXText(node) {
				reportIfMatch(context, node, node.value);
			},
			Literal(node) {
				reportIfMatch(context, node, node.value);
			},
			TemplateElement(node) {
				reportIfMatch(context, node, node.value && node.value.raw);
			},
		};
	},
};
