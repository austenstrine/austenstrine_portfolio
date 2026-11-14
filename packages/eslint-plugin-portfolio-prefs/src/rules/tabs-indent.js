'use strict';

/**
 * Prefer tabs for indentation (not leading spaces), except JSDoc ` *` lines
 * and content inside string/template literals.
 */
const JSDOC_LINE = /^ \*(?: |\/|$)/;

function inStringish(sourceCode, index) {
	const node = sourceCode.getNodeByRangeIndex(index);
	if(!node) {
		return false;
	}
	let current = node;
	while(current) {
		if(
			current.type === 'Literal'
			|| current.type === 'TemplateElement'
			|| current.type === 'TemplateLiteral'
		) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

module.exports = {
	meta: {
		type: 'layout',
		docs: {
			description: 'Use tabs for indentation, not leading spaces',
		},
		schema: [],
		messages: {
			useTabs: 'Use tabs for indentation (not leading spaces).',
		},
	},
	create(context) {
		const sourceCode = context.sourceCode || context.getSourceCode();
		return {
			'Program:exit'() {
				const lines = sourceCode.getText().split(/\r?\n/);
				for(let i = 0; i < lines.length; i++) {
					const line = lines[i];
					if(!line || !/^[ ]+/.test(line)) {
						continue;
					}
					if(JSDOC_LINE.test(line) || !line.trim()) {
						continue;
					}
					const indentLen = line.match(/^ +/)[0].length;
					const index = sourceCode.getIndexFromLoc({
						line: i + 1,
						column: indentLen,
					});
					if(inStringish(sourceCode, index)) {
						continue;
					}
					context.report({
						loc: {
							start: {
								line: i + 1,
								column: 0,
							},
							end: {
								line: i + 1,
								column: indentLen,
							},
						},
						messageId: 'useTabs',
					});
				}
			},
		};
	},
};
