# Cursor rules progressive disclosure (PEM-488 → PEM-490)

Audit and restructure of always-on Cursor context for `austenstrine_portfolio`. Goal: load only what is needed; pointers over inlines — **except** voice: ultracave is forced always-on (token savings on reply volume).

**Token method:** `chars / 4` (UTF-8 file bytes as chars). Project always-on = `AGENTS.md` + every `.cursor/rules/*.mdc` with `alwaysApply: true`. Does **not** include user-global rules, system prompts, or Skills bodies (Skills load on invoke/attach).

## Before PEM-488 (always-on)

| Path | Chars | ~Tokens |
|------|------:|--------:|
| `AGENTS.md` | 4981 | 1245 |
| 13 topic `.mdc` always-on bodies | ~23171 | ~5793 |
| **Total** | **28152** | **~7038** |

## After PEM-488 (discoverability voice)

| Path | Mode | Chars | ~Tokens | Why always-on |
|------|------|------:|--------:|---------------|
| `AGENTS.md` | hub | 2298 | 574 | Entry + hard never |
| `portfolio-essentials.mdc` | Always | 994 | 248 | Stack, git land, lint, hard never |
| `voice-modes.mdc` | Always | 710 | 178 | Discover how to invoke caveman/ultracave |
| **Total** | | **4002** | **~1000** | |

## After PEM-490 (forced ultracave)

| Path | Mode | Why always-on |
|------|------|---------------|
| `AGENTS.md` | hub | Entry + hard never + voice opt-out pointer |
| `portfolio-essentials.mdc` | Always | Stack, git land, lint, hard never |
| `voice-modes.mdc` | Always | **Mandatory ultracave** inline (skill does not attach to subagents) |

Re-measure after landing (see Verify). Target: always-on prefix still near **≤2k** tokens while ultracave body (~400–600) lives in `voice-modes.mdc`.

**Why inline:** host skill `~/.agents/skills/ultracave` has `disable-model-invocation: true` and does **not** attach to child agents. Coordinator kickoffs must work with mdc alone.

## Mode map

| File | Mode | Points to |
|------|------|-----------|
| `portfolio-essentials.mdc` | Always | `docs/git-commit-preferences.md`, `docs/agent/*` |
| `voice-modes.mdc` | Always | **inline ultracave** (opt-out phrases; optional host skills for `/caveman`) |
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
| `context-compress.mdc` | Intelligent | `docs/agent/context-compress.md` · `docs/context-compress-tooling.md` |
| `code-style-preferences.mdc` | Globs (`apps/web|crm`, `packages` `*.{ts,tsx}`) | `docs/code-style-preferences.md` |
| `viewport-testing.mdc` | Globs (web/crm TS/CSS) | `docs/agent/viewport-testing.md` |
| `dssh-backend-sigterm.mdc` | Manual (`@` only) | deep SIGTERM notes |

Long bodies live under `docs/agent/` (index: `docs/agent/index.md`).

## Caveman / ultracave (PEM-490)

- **Default:** ultracave **on** every turn for all agents/subagents via always-on `voice-modes.mdc`.
- **Opt out:** “stop caveman”, “normal mode”, “stop ultracave”.
- **Skill attach not required** for kickoffs or children.
- `/caveman` → host caveman skill; `/ultracave` / `/caveman ultra` keep ultracave; `/caveman status` reports only.

## Skills recommendation

Reusable multi-step workflows stay Intelligent rules + `docs/agent/*`. Optional project Skills under `.agents/skills/` — not required for this win.

## User-global offset

Do not delete user rules. Project intelligent `agent-coord-async` is the portfolio pointer; global remains host-wide.

## Verify

```bash
python3 - <<'PY'
from pathlib import Path
root = Path('.')
files = [root/'AGENTS.md'] + sorted(
	p for p in (root/'.cursor/rules').glob('*.mdc')
	if 'alwaysApply: true' in p.read_text()
)
total = 0
for p in files:
	n = len(p.read_text())
	total += n
	print(f'{n:5d} chars  ~{n/4:6.0f} tok  {p}')
print(f'TOTAL {total} chars ~{total/4:.0f} tok')
PY
```
