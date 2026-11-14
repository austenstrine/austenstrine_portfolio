'use strict';

/**
 * Prefer static className string literals (code-style preference).
 * Flags className built via + concat or template with embedded expressions
 * that look like Tailwind utilities.
 */
const UTIL_HINT = /\b(flex|grid|text-|bg-|p-|m-|w-|h-|rounded|justify-|items-|gap-|border)/;

function looksDynamic(expr) {
	if(!expr) {
		return false;
	}
	if(expr.type === 'BinaryExpression' && expr.operator === '+') {
		return true;
	}
	if(expr.type === 'TemplateLiteral' && expr.expressions && expr.expressions.length > 0) {
		const staticParts = expr.quasis.map((q) => q.value.cooked || '').join('');
		return UTIL_HINT.test(staticParts) || expr.expressions.length > 0;
	}
	if(expr.type === 'CallExpression') {
		const callee = expr.callee;
		if(callee.type === 'Identifier' && /^(clsx|classnames|cn|twMerge|cx)$/.test(callee.name)) {
			return false; // allow helpers
		}
	}
	return false;
}

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Avoid runtime-built Tailwind className strings',
		},
		schema: [],
		messages: {
			staticClass: 'Prefer static className string literals (no runtime-built Tailwind token names).',
		},
	},
	create(context) {
		return {
			JSXAttribute(node) {
				if(!node.name || node.name.name !== 'className') {
					return;
				}
				if(!node.value || node.value.type !== 'JSXExpressionContainer') {
					return;
				}
				if(looksDynamic(node.value.expression)) {
					context.report({
						node,
						messageId: 'staticClass',
					});
				}
			},
		};
	},
};
