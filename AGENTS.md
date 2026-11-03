# AGENTS

Start here for this repo.

1. Run `./bin/agent-cli` (or `./bin/agent-cli orient`) once before exploring.
2. Prefer `./bin/agent-cli <subcommand> [--json]` over re-reading `package.json`, `.dsshrc`, compose files, seed paths, or guessing npm/dssh commands.
3. Subcommands: `orient` `layout` `scripts` `env` `docker` `seed` `helpers` — see `./bin/agent-cli --help`.
4. Default git branch is **master**. On a shared VM, edit via `git worktree add`, not the shared checkout in place.
5. Sibling tool remotes may also be **master** — confirm with `git ls-remote --symref origin HEAD` rather than a local branch name.
