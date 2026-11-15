'use strict';

/**
 * data-pem-action controls with visible label text should hide that text on
 * mobile (sr-only / max-sm:sr-only / max-[399px]:sr-only pattern).
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

function hasMobileHideText(className) {
	return (
		/\bsr-only\b/.test(className)
		|| /\bmax-sm:sr-only\b/.test(className)
		|| /\bmax-\[399px\]:sr-only\b/.test(className)
		|| /\bmax-sm:hidden\b/.test(className)
		|| /\bsm:inline\b/.test(className)
		|| /\bsm:not-sr-only\b/.test(className)
	);
}

function collectTextish(children, out) {
	for(const child of children || []) {
		if(child.type === 'JSXText' && child.value.trim()) {
			out.push(child);
		}
		else if(child.type === 'JSXElement') {
			const open = child.openingElement;
			const cls = classNameFromAttr(getAttr(open, 'className') || getAttr(open, 'class'));
			if(hasMobileHideText(cls)) {
				continue;
			}
			collectTextish(child.children, out);
		}
		else if(child.type === 'JSXExpressionContainer' && child.expression.type === 'Literal') {
			if(String(child.expression.value || '').trim()) {
				out.push(child.expression);
			}
		}
	}
}

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Mobile action buttons should hide label text (icon-only)',
		},
		schema: [],
		messages: {
			hideTextOnMobile: 'Action controls (data-pem-action) should hide label text on mobile (e.g. wrap label in sr-only / max-sm:sr-only).',
		},
	},
	create(context) {
		return {
			JSXElement(node) {
				const open = node.openingElement;
				if(!getAttr(open, 'data-pem-action')) {
					return;
				}
				const texts = [];
				collectTextish(node.children, texts);
				if(texts.length === 0) {
					return;
				}
				context.report({
					node: open,
					messageId: 'hideTextOnMobile',
				});
			},
		};
	},
};
