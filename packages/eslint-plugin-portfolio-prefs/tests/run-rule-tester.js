'use strict';

/**
 * Fail-closed RuleTester for portfolio-prefs (adversary F-B-003).
 * Smoke create()-only checks are not enough — invalid fixtures must fail.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { RuleTester } = require('eslint');

const plugin = require('..');

let parser;
try {
	parser = require('@typescript-eslint/parser');
}
catch {
	parser = undefined;
}

const fixturesRoot = path.join(__dirname, 'fixtures');
const invalidDir = path.join(fixturesRoot, 'invalid');
const validDir = path.join(fixturesRoot, 'valid');

const tester = new RuleTester({
	languageOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		parser,
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
	},
});

const expected = Object.keys(plugin.rules);
assert.ok(expected.length > 0, 'plugin has no rules');

for(const id of expected) {
	const rule = plugin.rules[id];
	assert.ok(rule, `missing rule ${id}`);
	assert.equal(typeof rule.create, 'function', `${id}.create`);
	assert.ok(
		plugin.configs.recommended.rules[`portfolio-prefs/${id}`] !== undefined,
		`recommended missing ${id}`,
	);
}

function readFixture(dir, name) {
	return fs.readFileSync(path.join(dir, name), 'utf8');
}

tester.run('no-slug-in-ui-copy', plugin.rules['no-slug-in-ui-copy'], {
	valid: [
		{
			code: readFixture(validDir, 'slug-prop-ok.jsx'),
			filename: path.join(validDir, 'slug-prop-ok.jsx'),
		},
	],
	invalid: [
		{
			code: readFixture(invalidDir, 'slug-ui.jsx'),
			filename: path.join(invalidDir, 'slug-ui.jsx'),
			errors: [
				{
					messageId: 'noSlug',
				},
			],
		},
	],
});

tester.run('no-king-and-i', plugin.rules['no-king-and-i'], {
	valid: [
		{
			code: readFixture(invalidDir, 'king-and-i-cv.jsx'),
			filename: path.join(process.cwd(), 'apps/web/src/components/catalog/ProductCard.tsx'),
		},
	],
	invalid: [
		{
			code: readFixture(invalidDir, 'king-and-i-cv.jsx'),
			filename: path.join(process.cwd(), 'apps/web/src/app/cv/page.tsx'),
			errors: [
				{
					messageId: 'noKingAndI',
				},
			],
		},
	],
});

tester.run('session-aware-sign-in', plugin.rules['session-aware-sign-in'], {
	valid: [
		{
			code: 'import { RequireAccess } from \'x\';\nexport default function Page(){ return <RequireAccess><div /></RequireAccess>; }\n',
			filename: path.join(process.cwd(), 'apps/web/src/app/auth/account/page.tsx'),
		},
	],
	invalid: [
		{
			code: 'export default function Page(){ return <div>Sign in</div>; }\n',
			filename: path.join(process.cwd(), 'apps/web/src/app/auth/account/page.tsx'),
			errors: [
				{
					messageId: 'needRequireAccess',
				},
			],
		},
	],
});

tester.run('inplace-edit-default-off', plugin.rules['inplace-edit-default-off'], {
	valid: [
		{
			code: 'import { useState } from \'react\';\nexport function X(){ const [t, setT] = useState(\'off\'); return null; }\n',
			filename: path.join(process.cwd(), 'apps/web/src/components/catalog/InPlaceProductEdit.tsx'),
		},
	],
	invalid: [
		{
			code: 'import { useState } from \'react\';\nexport function X(){ const [t, setT] = useState(\'page\'); return null; }\n',
			filename: path.join(process.cwd(), 'apps/web/src/components/catalog/InPlaceProductEdit.tsx'),
			errors: [
				{
					messageId: 'defaultOff',
				},
			],
		},
	],
});

tester.run('no-directional-caret', plugin.rules['no-directional-caret'], {
	valid: [
		{
			code: 'export function X(){ return <ArrowRightIcon className="h-4 w-4" />; }\n',
		},
		{
			code: 'export function X(){ return <ChevronRightIcon className="h-3.5 w-3.5" />; }\n',
		},
	],
	invalid: [
		{
			code: 'export function X(){ return <ChevronRight />; }\n',
			errors: [
				{
					messageId: 'bannedIcon',
				},
			],
		},
		{
			code: 'export function X(){ return <span>›</span>; }\n',
			errors: [
				{
					messageId: 'useArrowIcons',
				},
			],
		},
	],
});

console.log(`portfolio-prefs RuleTester ok (${expected.length} rules; fixtures + recommended samples)`);
