# Git and commit preferences

Cursor loads `.cursor/rules/git-commit-preferences.mdc` (`alwaysApply: true`). Keep that file and this one in sync.

These rules apply to **this portfolio repo** (`austenstrine_portfolio`). Sibling tool repos (dssh, agent-coord, image CDN, etc.) have different landing prefs — see “Sibling tool repos” below.

## Branching

- Never develop on `master`.
- Feature branches: `feature/<user>/<target-merge-branch>/<feature-name>` (user often `als`; target is usually `development`).
- Default integration branch: **`development`** (kept based on `master`).
- Merge features → `development` **without feature PRs**.
- When another feature lands on `development`, rebase or pull that tip onto the feature branch and resolve conflicts there.
- When `development` looks stable: merge `development` → `master` (user-guided); then fast-forward `development` to that master tip.
- PRs are mainly for `development` → `master`, guided by the user.
- Do not modify `master` unless the user explicitly asks.
- Always create a **local** branch (`git checkout -b` / `git branch` / worktree) so it shows in GitKraken — never leave a branch remote-only.
- Same-VM shared checkouts: edit via `git worktree add`, not the shared tree in place.

## Commits / landing

- Prefer clear, focused commits. Match existing repo voice: scan recent `git log` on `development` (imperative, one job per commit).
- Local-first: prefer work on Austen’s machine checkout. After pushing `development`, sync his local checked-out `development` (`git fetch` + fast-forward/pull in the main portfolio checkout) so he sees the changes without a manual pull.
- Do not open unnecessary feature PRs when these prefs say merge to `development` directly.

## PR body writing (when a PR is needed)

Keep PR text concrete and plain. No jargon padding; for banned prose tells used in this Project’s chat/READMEs/PR bodies, follow Place et Marque store `principles/banned.md` (say what landed, not marketing tone).

## Sibling tool repos (not this repo)

Tool / helper remotes (e.g. `developers-sugary-shell-helper`, `agent-coord`, `golang-image-cdn`) usually integrate on **`master`** and may commit/merge without waiting for review. Confirm with `git ls-remote --symref origin HEAD`. Those prefs are **not** for this portfolio repo — here, integrate on `development` and leave `master` alone unless asked.

## Quick map

| Branch | Role in this repo |
|--------|-------------------|
| `master` | Stable / deploy tip. Agents do not land here unless asked. |
| `development` | Default integration. Features merge here (no PR). |
| `feature/<user>/development/<name>` | Active work. Local branch required. |
