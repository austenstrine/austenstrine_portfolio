'use strict';

/**
 * Portfolio preference ESLint rules (Angle B).
 * Rule ids: portfolio-prefs/<kebab-name>
 *
 * `recommended` — fail-closed defaults that should pass on current development tip.
 * `strict` — noisier / baseline-cleanup rules (enable after debt cleared).
 */
const rules = {
	'no-slug-in-ui-copy': require('./rules/no-slug-in-ui-copy'),
	'no-king-and-i': require('./rules/no-king-and-i'),
	'inplace-edit-default-off': require('./rules/inplace-edit-default-off'),
	'no-raw-svg-in-pages': require('./rules/no-raw-svg-in-pages'),
	'action-cluster-right-align': require('./rules/action-cluster-right-align'),
	'seller-chrome-no-cart': require('./rules/seller-chrome-no-cart'),
	'session-aware-sign-in': require('./rules/session-aware-sign-in'),
	'mobile-icon-only-actions': require('./rules/mobile-icon-only-actions'),
	'no-dynamic-tailwind-class': require('./rules/no-dynamic-tailwind-class'),
	'no-ink-as-surface': require('./rules/no-ink-as-surface'),
	'no-sketch-parens': require('./rules/no-sketch-parens'),
	'no-micromobile-gutter-pile': require('./rules/no-micromobile-gutter-pile'),
	'no-directional-caret': require('./rules/no-directional-caret'),
};

const recommendedRules = {
	'portfolio-prefs/no-slug-in-ui-copy': 'error',
	'portfolio-prefs/no-king-and-i': 'error',
	'portfolio-prefs/inplace-edit-default-off': 'error',
	'portfolio-prefs/no-raw-svg-in-pages': 'error',
	'portfolio-prefs/session-aware-sign-in': 'error',
	'portfolio-prefs/no-sketch-parens': 'error',
	'portfolio-prefs/no-directional-caret': 'error',
	'portfolio-prefs/no-ink-as-surface': 'error',
	// Opt-in via data-pem-* attributes (no-op until markup is tagged)
	'portfolio-prefs/action-cluster-right-align': 'warn',
	'portfolio-prefs/mobile-icon-only-actions': 'warn',
	'portfolio-prefs/seller-chrome-no-cart': 'warn',
	// Baseline debt — enable via configs.strict
	'portfolio-prefs/no-micromobile-gutter-pile': 'off',
	'portfolio-prefs/no-dynamic-tailwind-class': 'off',
};

const strictRules = {
	...recommendedRules,
	'portfolio-prefs/no-directional-caret': 'error',
	'portfolio-prefs/no-micromobile-gutter-pile': 'warn',
	'portfolio-prefs/no-dynamic-tailwind-class': 'warn',
};

const plugin = {
	meta: {
		name: 'eslint-plugin-portfolio-prefs',
		version: '0.1.0',
	},
	rules,
	configs: {
		recommended: {
			plugins: {
				'portfolio-prefs': null,
			},
			rules: recommendedRules,
		},
		strict: {
			plugins: {
				'portfolio-prefs': null,
			},
			rules: strictRules,
		},
	},
};

plugin.configs.recommended.plugins['portfolio-prefs'] = plugin;
plugin.configs.strict.plugins['portfolio-prefs'] = plugin;

module.exports = plugin;
