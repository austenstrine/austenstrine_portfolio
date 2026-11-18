# Context compress tooling (PEM-492)

Short map: what exists, what we wired, when to use / skip. Agents: `docs/agent/context-compress.md` + `./bin/context-compress`.

## Inventory (this host + repo)

| Tool | Role | Host before | After |
|------|------|-------------|--------|
| **RTK** (Rust Token Killer) | Filter noisy shell output before the model reads it | Missing | Binary `~/.local/bin/rtk` v1.2.0 |
| **ContextPrune** | AST prune / interface skeletons for repo prompts | Missing (npm name 404) | Via `npx github:maniraja5599/contextprune` |
| **caveman-compress** | Compress prose memory files to caveman; backup out-of-tree | Skill missing | `~/.agents/skills/caveman-compress` |
| **SuperCompress** | Query-aware extractive compress (MCP/API) | Missing | **Document only** (needs login / API key) |
| **ast-mcp** | Python AST skeletons | N/A | Skip — TS portfolio; ContextPrune covers the win |
| **graphify** | Structural graph (not a compressor) | On PATH | Already wired; use instead of wide Grep |
| **ultracave / caveman** | Reply voice (output tokens) | Host skills + always-on `voice-modes.mdc` | Unchanged |

Repo before: no wrappers, no agent pointers for these tools.

## Wired in repo

- `bin/context-compress` — `status` / `rtk` / `prune` / `skeleton` / `caveman`
- `docs/agent/context-compress.md` — when to run
- `.cursor/rules/context-compress.mdc` — Intelligent (not always-on)
- Pointers: `AGENTS.md`, `docs/agent/index.md`, progressive-disclosure mode map

## Install (host)

```bash
# RTK
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
# optional Cursor bash rewrite hook (dry-run first; merges ~/.cursor/hooks.json)
rtk init -g --agent cursor --dry-run
rtk init -g --agent cursor

# ContextPrune — prefer git; registry package name may 404
npx --yes github:maniraja5599/contextprune --help
# or: ./bin/context-compress prune --help

# caveman-compress (Cursor reads ~/.agents/skills; -g matters)
npx skills add JuliusBrussee/caveman --skill caveman-compress -a cursor -g

# SuperCompress (optional, account-gated)
npm i -g supercompress-proxy && npx supercompress setup
```

## When to use

| Situation | Tool |
|-----------|------|
| Huge `git`/`test`/`docker`/`npm` output | RTK (`rtk <cmd>` or hook) |
| Need repo contracts without full bodies | ContextPrune / `./bin/context-compress prune\|skeleton` |
| Long always-loaded prose (memory/todos) | caveman-compress |
| One bulky dump vs a specific question | SuperCompress (after setup) |
| “What connects X→Y” | graphify (already) |

## When not

- Tiny known-file edits — Read; skip prune.
- Secrets / `.env` / credentials — never caveman-compress or SuperCompress.
- Force tools with missing native deps on cloud — install pointer + soft fail.
- Bloat always-on rules — keep compress guidance Intelligent / docs only.
- Expect RTK to wrap Cursor `Read`/`Grep` without hook/pipelines — bash path only by default.

## Design notes

- Prefer **pointers + scripts** over always-on text.
- Compress **before** model ingest when gathering large context.
- SuperCompress left unwired in MCP until account setup — no fake win.
