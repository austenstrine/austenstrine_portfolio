# Context compress (agents)

Compress **outside the model** before stuffing large dumps into chat. Prefer `./bin/context-compress`. Full inventory + install: `docs/context-compress-tooling.md`.

## Prefer

| Job | Command |
|-----|---------|
| Tool status | `./bin/context-compress status` |
| Noisy shell (`git`, tests, logs) | Host `rtk <cmd>` after install; optional `rtk init -g --agent cursor` |
| Repo slice / AST skeletons | `./bin/context-compress prune --task "…" --target <path> --no-copy` |
| All-interface skeletons | `./bin/context-compress skeleton -o /tmp/skel.md` |
| Prose memory file (AGENTS/todos) | `/caveman-compress <abs-path>` or `./bin/context-compress caveman <file>` |
| Structural map (already wired) | `graphify query\|path\|explain` — not a compressor; use instead of wide Grep |

## Skip / when not

- Editing a small known file — Read it; do not prune the whole tree.
- Exact strings / secrets / `.env` — never caveman-compress or SuperCompress those.
- SuperCompress MCP — account/login; document-only until setup done.
- Cloud VM without host bins — follow install pointers; fail soft, do not invent output.

## Rules of thumb

1. Large gather → compress/skeletonize first → paste compact evidence into the model.
2. Keep always-on rules thin; this doc is on-demand (Intelligent rule `context-compress`).
3. RTK filters **command output**. Built-in Read/Grep bypass its bash hook — use `rtk read` / `rtk grep` or shell when that matters.
