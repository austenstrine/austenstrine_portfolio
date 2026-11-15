'use strict';

/**
 * In-place edit must default to off (PEM-239).
 * Flags useState initializers that start on page/card/element tiers.
 */
const ON_TIERS = new Set(['page', 'card', 'element']);

function isUseStateCallee(node) {
	if(node.type === 'Identifier') {
		return node.name === 'useState';
	}
	if(node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
		return node.property.name === 'useState';
	}
	return false;
}

function initialLooksLikeOnTier(arg) {
	if(!arg) {
		return false;
	}
	if(arg.type === 'Literal' && typeof arg.value === 'string') {
		return ON_TIERS.has(arg.value);
	}
	// useState<InPlaceEditTier>('page')
	if(arg.type === 'TSAsExpression' || arg.type === 'TSSatisfiesExpression') {
		return initialLooksLikeOnTier(arg.expression);
	}
	return false;
}

function typeMentionsInPlace(node) {
	// Best-effort: typeArgs on CallExpression (TS)
	const typeArgs = node.typeArguments || node.typeParameters;
	if(!typeArgs || !typeArgs.params) {
		return false;
	}
	return typeArgs.params.some((param) => {
		if(param.type === 'TSTypeReference' && param.typeName) {
			const name = param.typeName.name || (param.typeName.type === 'Identifier' && param.typeName.name);
			return typeof name === 'string' && /InPlaceEditTier/i.test(name);
		}
		return false;
	});
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'In-place edit tier state must default to off',
		},
		schema: [],
		messages: {
			defaultOff: 'In-place edit must default to “off”, not “{{tier}}”.',
		},
	},
	create(context) {
		return {
			CallExpression(node) {
				if(!isUseStateCallee(node.callee)) {
					return;
				}
				const arg = node.arguments[0];
				if(!initialLooksLikeOnTier(arg)) {
					return;
				}
				// Only when typed as InPlaceEditTier, or in known provider/edit files
				const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
				const inEditModule = /EditableVendors|InPlaceProduct|inplace-product-edit|inplace-edit/i.test(filename);
				if(!inEditModule && !typeMentionsInPlace(node)) {
					return;
				}
				const tier = arg.type === 'Literal'
					? arg.value
					: (arg.expression && arg.expression.value);
				context.report({
					node: arg,
					messageId: 'defaultOff',
					data: {
						tier: String(tier),
					},
				});
			},
		};
	},
};
