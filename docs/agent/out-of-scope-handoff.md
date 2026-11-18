# Out-of-scope handoff

Keep in sync with Place et Marque `preferences.md` (new GitHub repos / out-of-project workers).

## Rules

- New GitHub repos must be added to this Project’s Cloud Agent environment before agents can push them.
- Out-of-project repos need a worker started with the correct `repo_url` (and machine/placement when required).
- An already-running agent keeps its old token/repo set until a **new** run — do not assume mid-run access to a newly added repo.
- If the needed checkout, secret, SSH host, or forge access is not available here: write a short handoff (what, why blocked, exact next CreateAgent/env step) and stop. Do not invent workarounds that look like success (fake pushes, wrong-repo edits, “done” without landing).

## Prefer

- Coordinator/`CreateAgent` with the right `repo_url` / private worker / env.
- Explicit blocker notes under Project `internal/` when a cloud/self-hosted gap is structural.
