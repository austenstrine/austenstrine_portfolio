# Graphify

Keep in sync with `.cursor/rules/graphify.mdc`.

Local graph: `graphify-out/` (OSS CLI `graphify` / package `graphifyy`; optional MCP `graphify-mcp`).

**Hard rule:** `graphify query|path|explain` (or MCP) **before** wide Grep/Glob. Grep only after graph insufficient.

**Orientation:** `./bin/agent-cli orient` first (installs hooks + refreshes graph when stale), then Graphify for structure.

## Commands

- `graphify query "<question>"` — scoped subgraph
- `graphify path "<A>" "<B>"` — dependency path between symbols/files
- `graphify explain "<concept>"` — node + neighbors

## Keep graph current (cheap)

Prefer incremental ensure — **not** a full rebuild every time:

| Path | What |
|------|------|
| `./bin/agent-cli graphify` | `ops/tooling/graphify-ensure.sh` — skip when `graphify-out/.agent_graphify_head` == `git HEAD`; else `graphify update .` (or `extract . --code-only` if missing) |
| `./bin/agent-cli orient` | Agent-start: auto-runs `install-graphify-hooks.sh --quiet` then ensure (fail-open if CLI missing) |
| `npm prepare` | Same install on `npm install` / land |
| `ops/tooling/git-hooks/post-merge` + `post-checkout` | After merge/checkout. Install links `.git/hooks` **and**, when Cursor `core.hooksPath` → agent-hooks, adds `post-*` → `.dispatcher` (stock overlay only has commit-msg/prepare-commit-msg; without those entries post-* never runs). Proof marker: `graphify-out/.agent_graphify_last_hook` |

Stamp is vs **git HEAD** (SHA), not file mtime — `graphify update` does not always bump `graph.json` mtime. AST-only; no API key. `graphify-out/` stays gitignored.

Manual: `ops/tooling/install-graphify-hooks.sh`.

## Skip Graphify when

1. `graphify-out/graph.json` missing and cannot rebuild (`graphify` not on PATH — common on cloud VMs)
2. Already oriented via Graphify; need specific line edits/debug
3. Non-structural (exact string, one known file, env value)

Local MCP: `.cursor/mcp.json` → `graphify-mcp` against `graphify-out/graph.json`. Hosted `api.graphify.com` optional.

Also: Place et Marque `workflows/graphify.md`.
