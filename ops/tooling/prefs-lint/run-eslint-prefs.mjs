#!/usr/bin/env node
/**
 * Fail-closed ESLint prefs gate (Angle E / adversary F-B-003).
 * No registered rules → ok (scaffold).
 * With rules → RuleTester (fixtures + samples) then eslint; nonzero exit on errors.
 * Warn-severity portfolio-prefs rules do not fail the gate (arbiter baseline);
 * error-severity rules do. --no-inline-config avoids Next/React eslint-disable
 * comments referencing plugins this prefs-only config does not load.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const plugin = require(path.join(root, 'packages/eslint-plugin-portfolio-prefs/src/index.js'));
const rules = plugin.rules || {};
const names = Object.keys(rules);

if(names.length === 0)
{
	console.log('lint:eslint-prefs: no portfolio-prefs rules registered yet (scaffold ok)');
	process.exit(0);
}

const ruleTester = path.join(
	root,
	'packages/eslint-plugin-portfolio-prefs/tests/run-rule-tester.js',
);
const testerResult = spawnSync(
	process.execPath,
	[ruleTester],
	{ cwd: root, stdio: 'inherit' },
);
if(testerResult.status !== 0)
{
	process.exit(testerResult.status == null ? 1 : testerResult.status);
}

const eslintBin = path.join(root, 'node_modules/eslint/bin/eslint.js');
const result = spawnSync(
	process.execPath,
	[
		eslintBin,
		'apps/web',
		'apps/crm',
		'--no-inline-config',
	],
	{ cwd: root, stdio: 'inherit' },
);

process.exit(result.status == null ? 1 : result.status);
