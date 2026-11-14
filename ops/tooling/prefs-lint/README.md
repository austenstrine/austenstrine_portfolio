# prefs-lint

Fail-closed process / Cursor-sync checks for portfolio preferences.

- Add checks as `*.check.sh` in this directory (exit 0 ok, nonzero fail).
- Runner: `./ops/tooling/prefs-lint/run.sh`
- Wired via `./bin/agent-cli lint` and root `npm run lint`
- `banned-patterns.txt` mirrors Place et Marque `principles/banned.md` (markers `ban-1`…`ban-9`; keep in sync).

Do **not** put checks under `scripts/prefs-lint/`.
