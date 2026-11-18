# AGENTS

Start here for this repo.

1. Run `./bin/agent-cli` (or `./bin/agent-cli orient`) once before exploring.
2. Prefer `./bin/agent-cli <subcommand> [--json]` over re-reading `package.json`, `.dsshrc`, compose, seed paths, or guessing npm/dssh.
3. Subcommands: `orient` `layout` `scripts` `env` `docker` `seed` `helpers` — see `./bin/agent-cli --help`.
4. **Git (this portfolio):** integrate on **`development`**; features `feature/<user>/development/<name>` (user usually `als`); local branch required; merge features → `development` **no PR**; leave `master` alone unless asked; same-VM → `git worktree add`. Full: `docs/git-commit-preferences.md`.
5. **Fail-closed lint:** `./bin/agent-cli lint` (prefs + ESLint prefs + typecheck). Workspace `npm run lint -w apps/*` skips prefs.
6. **Rules map / progressive disclosure:** `docs/cursor-rules-progressive-disclosure.md`. Always-on: `portfolio-essentials.mdc` + `voice-modes.mdc`. Most other `.cursor/rules/*.mdc` are intelligent, globs, or manual — not always-on. Read the named doc when the task matches.
7. **Ultracave forever:** every agent/worker/subagent uses ultracave (repo `.cursor/rules/voice-modes.mdc`, alwaysApply). Skill attach not required / not reliable. **Coordinators MUST prepend** this paste (verbatim; also in `docs/agent/ultracave-kickoff.md`) to every `CreateAgent` / `SendToAgent` / `Task` kickoff (cloud + local):

```text
/ultracave
ULTRACAVE MANDATORY (no skill attach). Reply terse caveman: fragments, payload only, each fact once. Floor never cut: code/paths/errors/negations/numbers. Opt out only if user says stop caveman / normal mode / stop ultracave. Unsure? Still on. Full: .cursor/rules/voice-modes.mdc
```

Opt out only: “stop caveman” / “normal mode” / “stop ultracave”.


## Hard never

- Do not develop or land on `master` unless the user asks.
- Do not edit a shared checkout in place — use a worktree.
- Do not silently `docker stop|rm|kill|restart portfolio-api` / `portfolio-crm` (use user-terminal `dssh backend|crm restart; dssh logs …`).
- Do not fake out-of-scope forge/repo/env access — hand off instead.

When Austen input needed: run `/home/austen-loren-strine/Development/hey-alarm/hey` (shell only; no CreateAgent just to play the mp3).

If working on session/cookie, read this: docs/agent/cookie-epoch.md

## Read when needed

| Topic | Doc / rule |
|-------|------------|
| Orient / layout / docker | `./bin/agent-cli` |
| Cookie / session stamp | `docs/agent/cookie-epoch.md` (`COOKIE_EPOCH_UTC`, `pem_cookie_epoch`) |
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
| New chat on subject drift | `docs/agent/new-chat-on-drift.md` |
| agent-coord | `docs/agent/agent-coord.md` |
| Context compress (RTK / prune / caveman-compress) | `docs/agent/context-compress.md` · `./bin/context-compress` · report `docs/context-compress-tooling.md` |
| Voice / kickoff | **Ultracave mandatory** — `voice-modes.mdc` + kickoff paste `docs/agent/ultracave-kickoff.md`. Opt out: “stop caveman” / “normal mode” / “stop ultracave”. |
| Subagent stuck-loop watchdog | Coordinator: `docs/agent/subagent-watchdog.md` · `./bin/subagent-watchdog` · Project `workflows/subagent-watchdog.md` |
| Sibling tools (dssh install, etc.) | README “Third-party tools”; tool remotes usually land on `master` |
