# AGENTS

Start here for this repo.

1. Run `./bin/agent-cli` (or `./bin/agent-cli orient`) once before exploring.
2. Prefer `./bin/agent-cli <subcommand> [--json]` over re-reading `package.json`, `.dsshrc`, compose files, seed paths, or guessing npm/dssh commands.
3. Subcommands: `orient` `layout` `scripts` `env` `docker` `seed` `helpers` — see `./bin/agent-cli --help`.
4. Git: integrate on **`development`** (based on `master`). Feature branches: `feature/<user>/development/<name>` (user usually `als`). Merge features into `development` with no PR; leave `master` alone unless asked. After peers land on `development`, rebase/pull the feature onto it. On a shared VM, edit via `git worktree add`, not the shared checkout in place.
5. Sibling tool remotes are usually **`master`** — confirm with `git ls-remote --symref origin HEAD` rather than a local branch name.
6. `./dssh` needs [developers-sugary-shell-helper](https://github.com/austenstrine/developers-sugary-shell-helper): run that repo’s `./install.sh` and keep `~/.local/bin` on `PATH`, or clone as a sibling / set `DSSH_BIN`. See README “Third-party tools”.
7. Assume async peers always. Before contested edits: `./bin/agent-coord` claim / negotiate / release (sibling `~/Development/agent-coord`, or `~/.local/bin/agent-coord` via that repo’s `./install.sh`, or `AGENT_COORD_BIN`). HELLO discourse flag `0x01`. See Place et Marque store `workflows/agent-coordination.md` and `principles/agent-coordination-discourse.md`.
