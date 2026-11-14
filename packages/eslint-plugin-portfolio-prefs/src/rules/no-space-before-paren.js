'use strict';

/**
 * No space before `(` on if / switch / catch / while / for.
 * Pref: `if(...)` not `if (...)`.
 */
const KEYWORDS = new Set(['if', 'switch', 'catch', 'while', 'for', 'with']);

module.exports = {
	meta: {
		type: 'layout',
		docs: {
			description: 'No space before ( after if/switch/catch/while/for',
		},
		schema: [],
		messages: {
			noSpace: 'Remove the space before “(” after “{{keyword}}”.',
		},
	},
	create(context) {
		const sourceCode = context.sourceCode || context.getSourceCode();

		function check(node) {
			const token = sourceCode.getFirstToken(node);
			if(!token || !KEYWORDS.has(token.value)) {
				return;
			}
			const next = sourceCode.getTokenAfter(token);
			if(!next || next.value !== '(') {
				return;
			}
			const between = sourceCode.text.slice(token.range[1], next.range[0]);
			if(/[ \t]/.test(between) && !/\n/.test(between)) {
				context.report({
					loc: {
						start: token.loc.end,
						end: next.loc.start,
					},
					messageId: 'noSpace',
					data: {
						keyword: token.value,
					},
				});
			}
		}

		return {
			IfStatement: check,
			SwitchStatement: check,
			CatchClause: check,
			WhileStatement: check,
			ForStatement: check,
			ForInStatement: check,
			ForOfStatement: check,
		};
	},
};
