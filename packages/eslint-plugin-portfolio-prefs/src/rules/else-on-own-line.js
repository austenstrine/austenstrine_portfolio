'use strict';

/**
 * `} else {` banned — else (and else-if) each on their own line.
 */
module.exports = {
	meta: {
		type: 'layout',
		docs: {
			description: 'Put else / else if on their own line (not } else {)',
		},
		schema: [],
		messages: {
			elseNewline: 'Put “else” on its own line (not “} else {”).',
		},
	},
	create(context) {
		const sourceCode = context.sourceCode || context.getSourceCode();
		return {
			IfStatement(node) {
				if(!node.alternate) {
					return;
				}
				const between = sourceCode.getTokensBetween(node.consequent, node.alternate, {
					includeComments: false,
				});
				const elseToken = between.find((token) => token.value === 'else');
				if(!elseToken) {
					return;
				}
				const prev = sourceCode.getTokenBefore(elseToken);
				if(prev && prev.loc.end.line === elseToken.loc.start.line) {
					context.report({
						node: elseToken,
						messageId: 'elseNewline',
					});
				}
			},
		};
	},
};
