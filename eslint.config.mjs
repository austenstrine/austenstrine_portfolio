import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const portfolioPrefs = require('eslint-plugin-portfolio-prefs');

let tsParser = null;
try {
	tsParser = require('@typescript-eslint/parser');
}
catch {
	// Angle E may install parser with eslint; without it, only JS/JSX via espree default.
}

/**
 * Prefs-only flat config. Rules from packages/eslint-plugin-portfolio-prefs (Angle B).
 * Typecheck remains the workspace lint scripts; this file is for prefs AST rules.
 */
const recommended = portfolioPrefs.configs.recommended;

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ['apps/web/**/*.{js,jsx,ts,tsx}', 'apps/crm/**/*.{js,jsx,ts,tsx}'],
		...(tsParser
			? {
				languageOptions: {
					parser: tsParser,
					parserOptions: {
						ecmaFeatures: {
							jsx: true,
						},
						ecmaVersion: 'latest',
						sourceType: 'module',
					},
				},
			}
			: {
				languageOptions: {
					parserOptions: {
						ecmaFeatures: {
							jsx: true,
						},
						ecmaVersion: 'latest',
						sourceType: 'module',
					},
				},
			}),
		plugins: {
			'portfolio-prefs': portfolioPrefs,
		},
		rules: {
			...recommended.rules,
		},
	},
];
