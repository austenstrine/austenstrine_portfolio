'use strict';

/**
 * Minimal smoke: load plugin and assert each rule exports create().
 * Full ESLint RuleTester runs once eslint + parser are on the workspace.
 */
const assert = require('node:assert/strict');
const path = require('node:path');

const plugin = require('..');

const expected = [
	'no-slug-in-ui-copy',
	'no-king-and-i',
	'inplace-edit-default-off',
	'no-raw-svg-in-pages',
	'action-cluster-right-align',
	'seller-chrome-no-cart',
	'session-aware-sign-in',
	'mobile-icon-only-actions',
	'no-dynamic-tailwind-class',
	'no-ink-as-surface',
	'no-sketch-parens',
	'no-micromobile-gutter-pile',
	'no-directional-caret',
];

for(const id of expected) {
	const rule = plugin.rules[id];
	assert.ok(rule, `missing rule ${id}`);
	assert.equal(typeof rule.create, 'function', `${id}.create`);
	assert.ok(plugin.configs.recommended.rules[`portfolio-prefs/${id}`], `recommended missing ${id}`);
}

assert.equal(path.basename(path.dirname(__dirname)), 'eslint-plugin-portfolio-prefs');
console.log(`portfolio-prefs smoke ok (${expected.length} rules)`);
