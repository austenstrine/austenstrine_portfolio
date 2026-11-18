#!/usr/bin/env node
/**
 * Classify one subagent-watchdog sample → nudge JSON (schema subagent-watchdog.v1).
 * stdin or --sample PATH. State under SUBAGENT_WATCHDOG_DIR / --state.
 */
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const SCHEMA = 'subagent-watchdog.v1';
const BUDGET_SEC = { tiny: 3 * 60, medium: 7 * 60, big: 15 * 60 };
const ACTIVE = new Set([
	'RUNNING',
	'WAITING_FOR_BACKGROUND_WORK',
	'NOT_YET_STARTED',
	'active',
	'running',
	'waiting',
]);
const INACTIVE = new Set([
	'IDLE',
	'ERROR',
	'ARCHIVED',
	'EXPIRED',
	'done',
	'completed',
	'failed',
	'paused',
]);

function die(msg) {
	console.error(`subagent-watchdog: ${msg}`);
	process.exit(2);
}

function defaultStateDir() {
	if (process.env.SUBAGENT_WATCHDOG_DIR) return process.env.SUBAGENT_WATCHDOG_DIR;
	const xdgState = process.env.XDG_STATE_HOME || path.join(process.env.HOME || '.', '.local/state');
	return path.join(xdgState, 'subagent-watchdog');
}

function parseArgs(argv) {
	const out = { cmd: 'tick', sample: null, stateDir: process.env.SUBAGENT_WATCHDOG_DIR || null };
	const args = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--sample') {
			out.sample = argv[++i];
		} else if (a === '--state') {
			out.stateDir = argv[++i];
		} else if (a === '-h' || a === '--help') {
			out.help = true;
		} else if (a.startsWith('-')) {
			die(`unknown flag: ${a}`);
		} else {
			args.push(a);
		}
	}
	if (args[0]) out.cmd = args[0];
	if (!out.stateDir) out.stateDir = defaultStateDir();
	return out;
}

function emptyMetrics() {
	return {
		schema: 'subagent-watchdog-metrics.v1',
		ticks: 0,
		strategy_flips: 0,
		budget_breaches: 0,
		intervenes: 0,
		nudges: 0,
		pause_escalates: 0,
		ok: 0,
		updated_at: null,
	};
}

function loadMetrics(stateDir) {
	const p = path.join(stateDir, 'metrics.json');
	if (!fs.existsSync(p)) return emptyMetrics();
	try {
		return { ...emptyMetrics(), ...JSON.parse(fs.readFileSync(p, 'utf8')) };
	} catch {
		return emptyMetrics();
	}
}

function recordTickMetrics(stateDir, out) {
	const metrics = loadMetrics(stateDir);
	metrics.ticks = (metrics.ticks || 0) + 1;
	const at = out.polled_at || new Date().toISOString();
	metrics.updated_at = at;
	const events = [];
	for (const row of out.actions || []) {
		const action = row.action || 'ok';
		if (action === 'ok') {
			metrics.ok = (metrics.ok || 0) + 1;
		} else {
			metrics.intervenes = (metrics.intervenes || 0) + 1;
			if (action === 'force_rotate') metrics.strategy_flips = (metrics.strategy_flips || 0) + 1;
			if (action === 'budget_intervene' || String(row.reason || '').includes('over_budget')) {
				metrics.budget_breaches = (metrics.budget_breaches || 0) + 1;
			}
			if (action === 'nudge') metrics.nudges = (metrics.nudges || 0) + 1;
			if (action === 'pause_escalate') metrics.pause_escalates = (metrics.pause_escalates || 0) + 1;
		}
		events.push({
			at,
			worker_id: row.worker_id,
			action,
			reason: row.reason || null,
			pause: Boolean(row.pause),
		});
	}
	fs.writeFileSync(path.join(stateDir, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
	const line = JSON.stringify({
		at,
		kind: 'tick',
		active_workers: out.active_workers,
		should_poll: out.should_poll,
		actions: events,
		counters: {
			ticks: metrics.ticks,
			strategy_flips: metrics.strategy_flips,
			budget_breaches: metrics.budget_breaches,
			intervenes: metrics.intervenes,
		},
	});
	fs.appendFileSync(path.join(stateDir, 'metrics.jsonl'), line + '\n');
	out.metrics = metrics;
	out.metrics_log = path.join(stateDir, 'metrics.jsonl');
	return metrics;
}

function nowMs(iso) {
	if (iso) {
		const t = Date.parse(iso);
		if (!Number.isNaN(t)) return t;
	}
	return Date.now();
}

function normToken(s) {
	return String(s || '')
		.toLowerCase()
		.replace(/[0-9a-f]{7,}/g, '#')
		.replace(/\b\d+\b/g, '#')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

function fingerprint(turn) {
	if (turn.strategy && String(turn.strategy).trim()) {
		return 's:' + normToken(turn.strategy);
	}
	const tools = (turn.tools || []).map(normToken).filter(Boolean).sort().join(',');
	const summary = normToken(turn.summary || turn.text || '');
	const stem = summary.split(' ').slice(0, 8).join(' ');
	return crypto.createHash('sha1').update(`${tools}|${stem}`).digest('hex').slice(0, 12);
}

function similar(a, b) {
	if (!a || !b) return false;
	if (a === b) return true;
	const pa = a.replace(/^s:/, '').split(/[\s:_-]/)[0];
	const pb = b.replace(/^s:/, '').split(/[\s:_-]/)[0];
	return pa.length >= 3 && pa === pb;
}

function loadState(stateDir, id) {
	const p = path.join(stateDir, `worker-${id}.json`);
	if (!fs.existsSync(p)) {
		return {
			id,
			slight_count: 0,
			different_fail_count: 0,
			last_fp: null,
			approach_fps: [],
			intervened_budget: false,
			paused: false,
			history: [],
		};
	}
	return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveState(stateDir, st) {
	fs.writeFileSync(path.join(stateDir, `worker-${st.id}.json`), JSON.stringify(st, null, 2) + '\n');
}

function isActive(w) {
	if (w.paused) return false;
	const s = String(w.status || 'RUNNING');
	if (ACTIVE.has(s)) return true;
	if (INACTIVE.has(s)) return false;
	return true;
}

function readSample(samplePath) {
	let raw;
	if (!samplePath || samplePath === '-') {
		raw = fs.readFileSync(0, 'utf8');
	} else {
		if (!fs.existsSync(samplePath)) die(`sample not found: ${samplePath}`);
		raw = fs.readFileSync(samplePath, 'utf8');
	}
	try {
		return JSON.parse(raw);
	} catch {
		die('sample is not valid JSON');
	}
}

function classify(sample, stateDir) {
	const workers = Array.isArray(sample.workers) ? sample.workers : [];
	const activeWorkers = workers.filter(isActive);
	const polledAt = sample.polled_at || new Date().toISOString();
	const baseNow = nowMs(polledAt);
	const actions = [];

	for (const w of workers) {
		const id = String(w.id || 'unknown');
		const st = loadState(stateDir, id);
		st.paused = Boolean(w.paused) || st.paused;

		if (!isActive(w) && !w.paused) {
			actions.push({ worker_id: id, action: 'ok', reason: 'inactive', pause: false });
			saveState(stateDir, st);
			continue;
		}

		if (st.paused || w.paused) {
			actions.push({
				worker_id: id,
				action: 'pause_escalate',
				reason: 'already_paused_awaiting_plan',
				pause: true,
				send_to_agent: {
					message:
						'PAUSED. Stay idle until Project coordinator sends a new plan. Do not resume prior loop.',
				},
				send_to_coordinator: {
					message: `Worker ${id} still paused — waiting on better plan before resume.`,
				},
			});
			saveState(stateDir, st);
			continue;
		}

		const turns = Array.isArray(w.turns) ? w.turns : [];
		const fps = turns.map(fingerprint);
		const latest = fps.length ? fps[fps.length - 1] : null;

		let trailingSlight = 0;
		if (latest) {
			for (let i = fps.length - 1; i >= 0; i--) {
				if (similar(fps[i], latest)) trailingSlight++;
				else break;
			}
		}

		let sameExact = 0;
		if (latest) {
			for (let i = fps.length - 1; i >= 0; i--) {
				if (fps[i] === latest) sameExact++;
				else break;
			}
		}

		const size = String(w.task_size || 'medium').toLowerCase();
		const budget = BUDGET_SEC[size] || BUDGET_SEC.medium;
		const started = nowMs(w.started_at);
		const elapsedSec = Math.max(0, Math.floor((baseNow - started) / 1000));
		const overBudget = elapsedSec > budget;

		if (latest && latest !== st.last_fp) {
			if (st.last_fp && similar(latest, st.last_fp)) {
				st.slight_count = (st.slight_count || 0) + 1;
			} else if (st.last_fp) {
				st.slight_count = 1;
				st.approach_fps = [...(st.approach_fps || []), latest].slice(-12);
			} else {
				st.slight_count = 1;
			}
			st.last_fp = latest;
			st.history = [...(st.history || []), { at: polledAt, fp: latest }].slice(-40);
		}

		if (w.approach_failed) {
			st.different_fail_count = (st.different_fail_count || 0) + 1;
		}
		if (typeof w.slight_count === 'number') st.slight_count = w.slight_count;
		if (typeof w.different_fail_count === 'number') {
			st.different_fail_count = w.different_fail_count;
		}

		const slight = Math.max(st.slight_count || 0, trailingSlight);
		const differentFails = st.different_fail_count || 0;

		let action = 'ok';
		let reason = 'on_track';
		let pause = false;
		let send_to_agent = null;
		let send_to_coordinator = null;

		if (differentFails >= 3) {
			action = 'pause_escalate';
			reason = `three_very_different_approaches_failed (${differentFails})`;
			pause = true;
			st.paused = true;
			send_to_agent = {
				message:
					'PAUSE. Three very different approaches failed. Stop. Do not retry. Wait for Project coordinator plan.',
			};
			send_to_coordinator = {
				message: `Worker ${id} paused after 3 very-different failures. Elapsed ${elapsedSec}s / budget ${budget}s (${size}). Latest fp=${latest}. Need better plan before resume.`,
			};
		} else if (sameExact >= 4 || trailingSlight >= 4) {
			action = 'force_rotate';
			reason = `same_strategy_${sameExact >= 4 ? sameExact + '_exact' : trailingSlight + '_slight'}_retries`;
			send_to_agent = {
				message: `LOOP. Same strategy ${Math.max(sameExact, trailingSlight)}× with only slight tweaks. Stop. Switch to a very different approach now (new hypothesis / tool class / surface). Do not tweak flags again.`,
			};
		} else if (slight >= 3) {
			action = 'force_rotate';
			reason = `slight_variations_cap (${slight})`;
			send_to_agent = {
				message:
					'ROTATE. Hit max 3 slight variations of this approach. Next move must be very different — not another small tweak.',
			};
		} else if (overBudget) {
			if (st.intervened_budget && elapsedSec > budget * 1.5) {
				action = 'pause_escalate';
				reason = `over_budget_escalate (${elapsedSec}s > ${budget}s, ${size})`;
				pause = true;
				st.paused = true;
				send_to_agent = {
					message: `PAUSE. Over ${size} budget (${elapsedSec}s > ${budget}s) after prior nudge. Stop and wait for coordinator plan.`,
				};
				send_to_coordinator = {
					message: `Worker ${id} over ${size} budget (${elapsedSec}s > ${budget}s) after intervene. Paused. Need plan.`,
				};
			} else {
				action = 'budget_intervene';
				reason = `over_budget (${elapsedSec}s > ${budget}s, ${size})`;
				st.intervened_budget = true;
				send_to_agent = {
					message: `BUDGET. ${size} task over ${budget}s wall (${elapsedSec}s). Finish the critical path now or escalate with a blocker — no more exploration loops.`,
				};
			}
		} else if (slight >= 2) {
			action = 'nudge';
			reason = `approaching_slight_cap (${slight}/3)`;
			send_to_agent = {
				message: `Nudge: ${slight} slight variations already. One more max, then you must change approach entirely. Stay on the assigned task.`,
			};
		}

		const row = {
			worker_id: id,
			action,
			reason,
			pause,
			metrics: {
				task_size: size,
				elapsed_sec: elapsedSec,
				budget_sec: budget,
				slight_count: slight,
				same_exact: sameExact,
				different_fail_count: differentFails,
				latest_fp: latest,
			},
		};
		if (send_to_agent) row.send_to_agent = send_to_agent;
		if (send_to_coordinator) row.send_to_coordinator = send_to_coordinator;
		actions.push(row);
		saveState(stateDir, st);
	}

	return {
		schema: SCHEMA,
		polled_at: polledAt,
		active_workers: activeWorkers.length,
		should_poll: activeWorkers.length >= 1,
		state_dir: stateDir,
		actions,
	};
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
	console.log(
		`Usage: classify.mjs [tick|active|metrics] --sample PATH|--sample - [--state DIR]`,
	);
	process.exit(0);
}

fs.mkdirSync(opts.stateDir, { recursive: true });

if (opts.cmd === 'metrics') {
	const metrics = loadMetrics(opts.stateDir);
	const out = {
		schema: 'subagent-watchdog-metrics.v1',
		state_dir: opts.stateDir,
		metrics_json: path.join(opts.stateDir, 'metrics.json'),
		metrics_log: path.join(opts.stateDir, 'metrics.jsonl'),
		...metrics,
	};
	process.stdout.write(JSON.stringify(out, null, 2) + '\n');
	process.exit(0);
}

if (opts.cmd === 'active' || opts.cmd === 'tick') {
	const sample = readSample(opts.sample);
	if (opts.cmd === 'active') {
		const workers = Array.isArray(sample.workers) ? sample.workers : [];
		const active = workers.filter(isActive);
		const out = {
			schema: SCHEMA,
			active_workers: active.length,
			should_poll: active.length >= 1,
			ids: active.map((w) => w.id),
		};
		process.stdout.write(JSON.stringify(out) + '\n');
		process.exit(active.length >= 1 ? 0 : 1);
	}
	const out = classify(sample, opts.stateDir);
	recordTickMetrics(opts.stateDir, out);
	fs.writeFileSync(path.join(opts.stateDir, 'last-tick.json'), JSON.stringify(out, null, 2) + '\n');
	process.stdout.write(JSON.stringify(out, null, 2) + '\n');
	process.exit(0);
}

die(`unknown command: ${opts.cmd}`);
