# AGENTS

Start here for this repo.

1. Run `./bin/agent-cli` (or `./bin/agent-cli orient`) once before exploring.
2. Prefer `./bin/agent-cli <subcommand> [--json]` over re-reading `package.json`, `.dsshrc`, compose files, seed paths, or guessing npm/dssh commands.
3. Subcommands: `orient` `layout` `scripts` `env` `docker` `seed` `helpers` — see `./bin/agent-cli --help`.
4. Git: integrate on **`development`** (based on `master`). Feature branches: `feature/<user>/development/<name>` (user usually `als`). Merge features into `development` with no PR; leave `master` alone unless asked. After peers land on `development`, rebase/pull the feature onto it. On a shared VM, edit via `git worktree add`, not the shared checkout in place.
5. Sibling tool remotes are usually **`master`** — confirm with `git ls-remote --symref origin HEAD` rather than a local branch name.
6. `./dssh` needs [developers-sugary-shell-helper](https://github.com/austenstrine/developers-sugary-shell-helper): run that repo’s `./install.sh` and keep `~/.local/bin` on `PATH`, or clone as a sibling / set `DSSH_BIN`. See README “Third-party tools”.
7. Assume async peers always. Before contested edits: `./bin/agent-coord` claim / negotiate / release (sibling `~/Development/agent-coord`, or `~/.local/bin/agent-coord` via that repo’s `./install.sh`, or `AGENT_COORD_BIN`). HELLO discourse flag `0x01`. See Place et Marque store `workflows/agent-coordination.md` and `principles/agent-coordination-discourse.md`.
8. **Local backend restarts:** agents may restart `./dssh backend` / `portfolio-api` when needed, but must run `dssh backend restart; dssh logs backend` in the **user's Cursor terminal** in this window (prefer the active backend/dssh terminal). If the agent cannot drive that terminal, prompt the user to run it and wait until they indicate done before continuing work that depends on the new backend. Do not silently `docker stop|rm|restart portfolio-api` in the background — that confuses the user's log stream with SIGTERM. SIGTERM during a proper user-terminal restart is expected (old container replace), not a Nest bug. See `.cursor/rules/dssh-backend-ownership.mdc`.
