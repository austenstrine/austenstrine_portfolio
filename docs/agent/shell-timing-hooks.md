# Shell-timing hooks awareness

Keep in sync with Place et Marque `workflows/cursor-shell-timing-hooks.md`.

## What you get

On Austen’s self-hosted host, user hooks under `~/.cursor/hooks.json` inject Shell wall time via `postToolUse` / `postToolUseFailure` → `additional_context` (not `afterShellExecution`).

Treat injected lines as real signal:

- Duration at/above report threshold
- **SLOW** / **VERY SLOW**
- **LOOP** (same fingerprint repeated)
- Tiny-diff + long-test warnings

## Prefer

- After a SLOW/LOOP/tiny-diff warning: change approach (narrower command, cache, skip full suite for a one-line fix) instead of re-running the same long command.
- Keep hooks fail-open (bash + `jq`); do not “fix” timing by disabling hooks.

## Limits (honest)

- Cursor Cloud VMs do **not** load `~/.cursor` user hooks — expect no injection there.
- Repo CI cannot prove an agent heeded a warning; this rule is agent-facing. Optional host check: hooks scripts exist (soft).
