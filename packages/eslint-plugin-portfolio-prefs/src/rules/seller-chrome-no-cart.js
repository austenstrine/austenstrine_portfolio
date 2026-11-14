'use strict';

/**
 * Seller-facing chrome must not render cart without a sellerChrome gate.
 * Heuristic: CartIcon / href to /cart in CatalogHeader-like files must sit
 * under a sellerChrome (or pathUsesSellerChrome) conditional.
 */
function isCartHref(node) {
	if(node.type !== 'JSXAttribute' || !node.name || node.name.name !== 'href') {
		return false;
	}
	if(!node.value) {
		return false;
	}
	if(node.value.type === 'Literal') {
		return /\/place-et-marque\/cart\b|\/cart\b/.test(String(node.value.value || ''));
	}
	if(node.value.type === 'JSXExpressionContainer' && node.value.expression.type === 'Literal') {
		return /\/place-et-marque\/cart\b|\/cart\b/.test(String(node.value.expression.value || ''));
	}
	return false;
}

function isCartIcon(node) {
	return (
		node.type === 'JSXOpeningElement'
		&& node.name
		&& node.name.type === 'JSXIdentifier'
		&& node.name.name === 'CartIcon'
	);
}

function hasSellerGateInAncestors(node) {
	let current = node.parent;
	while(current) {
		if(current.type === 'ConditionalExpression') {
			const testSource = serializeTest(current.test);
			if(/sellerChrome|pathUsesSellerChrome|isSeller/.test(testSource)) {
				return true;
			}
		}
		if(current.type === 'LogicalExpression') {
			const left = serializeTest(current.left);
			if(/sellerChrome|pathUsesSellerChrome|isSeller/.test(left)) {
				return true;
			}
		}
		if(current.type === 'IfStatement') {
			const testSource = serializeTest(current.test);
			if(/sellerChrome|pathUsesSellerChrome|isSeller/.test(testSource)) {
				return true;
			}
		}
		current = current.parent;
	}
	return false;
}

function serializeTest(node) {
	if(!node) {
		return '';
	}
	if(node.type === 'Identifier') {
		return node.name;
	}
	if(node.type === 'UnaryExpression') {
		return serializeTest(node.argument);
	}
	if(node.type === 'CallExpression') {
		return serializeTest(node.callee);
	}
	if(node.type === 'MemberExpression') {
		return `${serializeTest(node.object)}.${serializeTest(node.property)}`;
	}
	if(node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
		return `${serializeTest(node.left)} ${serializeTest(node.right)}`;
	}
	return node.type || '';
}

function isSellerChromeModule(filename) {
	const normalized = filename.replace(/\\/g, '/');
	// Only shared chrome that must hide cart on seller routes — not buyer pages.
	return (
		/CatalogHeader/i.test(normalized)
		|| /MarketplaceFooter/i.test(normalized)
		|| /SellerPageActionPane/i.test(normalized)
	);
}

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Cart UI in seller chrome modules must be gated by sellerChrome',
		},
		schema: [],
		messages: {
			ungatedCart: 'Cart UI in seller-chrome modules must be gated by sellerChrome / pathUsesSellerChrome so seller routes hide the cart.',
		},
	},
	create(context) {
		const filename = context.filename || context.getFilename();
		if(!isSellerChromeModule(filename)) {
			return {};
		}
		function check(node) {
			if(hasSellerGateInAncestors(node)) {
				return;
			}
			context.report({
				node,
				messageId: 'ungatedCart',
			});
		}
		return {
			JSXOpeningElement(node) {
				if(isCartIcon(node)) {
					check(node);
					return;
				}
				for(const attr of node.attributes || []) {
					if(isCartHref(attr)) {
						check(attr);
					}
				}
			},
		};
	},
};
