# AGENTS

Start here for this repo.

1. Run `./bin/agent-cli` (or `./bin/agent-cli orient`) once before exploring.
2. Prefer `./bin/agent-cli <subcommand> [--json]` over re-reading `package.json`, `.dsshrc`, compose, seed paths, or guessing npm/dssh.
3. Subcommands: `orient` `layout` `scripts` `env` `docker` `seed` `helpers` — see `./bin/agent-cli --help`.
4. **Git (this portfolio):** integrate on **`development`**; features `feature/<user>/development/<name>` (user usually `als`); local branch required; merge features → `development` **no PR**; leave `master` alone unless asked; same-VM → `git worktree add`. Full: `docs/git-commit-preferences.md`.
5. **Fail-closed lint:** `./bin/agent-cli lint` (prefs + ESLint prefs + typecheck). Workspace `npm run lint -w apps/*` skips prefs.
6. **Rules map / progressive disclosure:** `docs/cursor-rules-progressive-disclosure.md`. Most `.cursor/rules/*.mdc` are intelligent, globs, or manual — not always-on. Read the named doc when the task matches.

## Hard never

- Do not develop or land on `master` unless the user asks.
- Do not edit a shared checkout in place — use a worktree.
- Do not silently `docker stop|rm|kill|restart portfolio-api` / `portfolio-crm` (use user-terminal `dssh backend|crm restart; dssh logs …`).
- Do not fake out-of-scope forge/repo/env access — hand off instead.

## Read when needed

| Topic | Doc / rule |
|-------|------------|
| Orient / layout / docker | `./bin/agent-cli` |
| Code style (TS/TSX) | `docs/code-style-preferences.md` |
| Graphify | `docs/agent/graphify.md` |
| Local-first / sync `development` | `docs/agent/local-first.md` |
| `dssh launch` | `docs/agent/dssh-launch.md` |
| Backend / CRM restart | `docs/agent/dssh-backend-ownership.md` |
| Tiny-copy doer+adversary | `docs/agent/tiny-copy-doer-adversary.md` |
| Show-don’t-tell | `docs/agent/show-dont-tell.md` |
| Viewport bands | `docs/agent/viewport-testing.md` |
| Shell-timing hooks | `docs/agent/shell-timing-hooks.md` |
| Out-of-scope handoff | `docs/agent/out-of-scope-handoff.md` |
| agent-coord | `docs/agent/agent-coord.md` |
| Voice | **Ultracave always-on** (rule `voice-modes`, inline — skill attach not required). Opt out: “stop caveman” / “normal mode” / “stop ultracave”. `/caveman` → caveman skill. |
| Sibling tools (dssh install, etc.) | README “Third-party tools”; tool remotes usually land on `master` |
