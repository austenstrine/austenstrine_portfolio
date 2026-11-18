# Cursor rules progressive disclosure (PEM-488)

Audit and restructure of always-on Cursor context for `austenstrine_portfolio`. Goal: load only what is needed; pointers over inlines.

**Token method:** `chars / 4` (UTF-8 file bytes as chars). Project always-on = `AGENTS.md` + every `.cursor/rules/*.mdc` with `alwaysApply: true`. Does **not** include user-global rules, system prompts, or Skills bodies (Skills load on invoke/attach).

## Before (always-on)

| Path | Chars | ~Tokens |
|------|------:|--------:|
| `AGENTS.md` | 4981 | 1245 |
| `.cursor/rules/agent-coord-async.mdc` | 374 | 94 |
| `.cursor/rules/code-style-preferences.mdc` | 7383 | 1846 |
| `.cursor/rules/dssh-backend-ownership.mdc` | 2513 | 628 |
| `.cursor/rules/dssh-launch.mdc` | 1257 | 314 |
| `.cursor/rules/git-commit-preferences.mdc` | 2706 | 676 |
| `.cursor/rules/graphify.mdc` | 1357 | 339 |
| `.cursor/rules/local-first.mdc` | 1236 | 309 |
| `.cursor/rules/new-chat-on-drift.mdc` | 471 | 118 |
| `.cursor/rules/out-of-scope-handoff.mdc` | 1046 | 262 |
| `.cursor/rules/shell-timing-hooks.mdc` | 1079 | 270 |
| `.cursor/rules/show-dont-tell.mdc` | 999 | 250 |
| `.cursor/rules/tiny-copy-doer-adversary.mdc` | 1346 | 336 |
| `.cursor/rules/viewport-testing.mdc` | 1404 | 351 |
| **Total** | **28152** | **~7038** |

Notes:

- No repo `.cursorrules`. No project `CLAUDE.md` (only unrelated `node_modules` hit).
- User-global (document only, not deleted): `~/.cursor/rules/agent-coord-async.mdc` (~140 tok). Project still has its own intelligent `agent-coord-async` pointer.
- Skills (host): `~/.agents/skills/caveman`, `~/.agents/skills/ultracave` (+ mirrors under `~/.cursor/caveman/skills/`). Ultracave has `disable-model-invocation: true` — must be invoked explicitly.

## After (always-on)

| Path | Mode | Chars | ~Tokens | Why always-on |
|------|------|------:|--------:|---------------|
| `AGENTS.md` | hub | 2298 | 574 | Entry + hard never + read-when-needed table |
| `.cursor/rules/portfolio-essentials.mdc` | Always | 994 | 248 | Stack, git land, lint, hard never |
| `.cursor/rules/voice-modes.mdc` | Always | 710 | 178 | Discoverability for `/caveman` `/ultracave` without forcing terse every turn |
| **Total** | | **4002** | **~1000** | Under 1–2k target |

**Estimated reduction:** ~7038 → ~1000 always-on tokens (**~86%** / ~6038 tokens off the always-on prefix).

## Mode map (after)

| File | Mode | Points to |
|------|------|-----------|
| `portfolio-essentials.mdc` | Always | `docs/git-commit-preferences.md`, `docs/agent/*` |
| `voice-modes.mdc` | Always | host caveman/ultracave skills |
| `agent-coord-async.mdc` | Intelligent | `docs/agent/agent-coord.md` |
| `dssh-backend-ownership.mdc` | Intelligent | `docs/agent/dssh-backend-ownership.md` |
| `dssh-launch.mdc` | Intelligent | `docs/agent/dssh-launch.md` |
| `git-commit-preferences.mdc` | Intelligent | `docs/git-commit-preferences.md` |
| `graphify.mdc` | Intelligent | `docs/agent/graphify.md` |
| `local-first.mdc` | Intelligent | `docs/agent/local-first.md` |
| `new-chat-on-drift.mdc` | Intelligent | `docs/agent/new-chat-on-drift.md` |
| `out-of-scope-handoff.mdc` | Intelligent | `docs/agent/out-of-scope-handoff.md` |
| `shell-timing-hooks.mdc` | Intelligent | `docs/agent/shell-timing-hooks.md` |
| `show-dont-tell.mdc` | Intelligent | `docs/agent/show-dont-tell.md` |
| `tiny-copy-doer-adversary.mdc` | Intelligent | `docs/agent/tiny-copy-doer-adversary.md` |
| `code-style-preferences.mdc` | Globs (`apps/web|crm`, `packages` `*.{ts,tsx}`) | `docs/code-style-preferences.md` |
| `viewport-testing.mdc` | Globs (web/crm TS/CSS) | `docs/agent/viewport-testing.md` |
| `dssh-backend-sigterm.mdc` | Manual (`@` only) | deep SIGTERM notes |

Long bodies live under `docs/agent/` (index: `docs/agent/index.md`). Guidance was relocated, not deleted.

## Caveman / ultracave

- **Problem:** ultracave skill sets `disable-model-invocation: true` — silent skill never auto-attaches; agents may not know how to invoke.
- **Fix:** thin always-on `voice-modes.mdc` documents `/caveman`, `/ultracave`, `/caveman ultra`, attach paths, persistence until “stop caveman” / “normal mode”.
- **Explicitly not done:** forcing caveman/ultracave on every turn.

## Skills recommendation

Reusable multi-step workflows (tiny-copy doer+adversary, dssh launch) stay as Intelligent rules + `docs/agent/*` for now. Optional follow-up: project Skills under `.agents/skills/` so full bodies load only on attach — not required for this token win.

## User-global offset

Do not delete user rules. If global `agent-coord-async` duplicates project guidance, prefer keeping the project intelligent rule as the portfolio-specific pointer; global remains host-wide for other repos.

## Verify

Re-measure anytime:

```bash
python3 - <<'PY'
from pathlib import Path
root = Path('.')
files = [root/'AGENTS.md'] + [p for p in (root/'.cursor/rules').glob('*.mdc') if 'alwaysApply: true' in p.read_text()]
print(sum(len(p.read_text()) for p in files)/4)
PY
```
