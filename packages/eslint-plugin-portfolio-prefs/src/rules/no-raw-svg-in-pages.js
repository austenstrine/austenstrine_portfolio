'use strict';

/**
 * No raw <svg> in pages / app routes — use components/icons/*.
 */
function isPagePath(filename) {
	const normalized = filename.replace(/\\/g, '/');
	if(/\/components\/icons\//i.test(normalized)) {
		return false;
	}
	return (
		/\/apps\/web\/src\/app\//i.test(normalized)
		|| /\/apps\/crm\/src\/app\//i.test(normalized)
		|| /\/pages\//i.test(normalized)
	);
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow raw <svg> in app pages; use icon components',
		},
		schema: [],
		messages: {
			noRawSvg: 'Do not put raw <svg> in pages. Move it to apps/web/src/components/icons/ with a className prop.',
		},
	},
	create(context) {
		const filename = context.filename || context.getFilename();
		if(!isPagePath(filename)) {
			return {};
		}
		return {
			JSXOpeningElement(node) {
				const name = node.name;
				if(name && name.type === 'JSXIdentifier' && name.name === 'svg') {
					context.report({
						node,
						messageId: 'noRawSvg',
					});
				}
			},
		};
	},
};
