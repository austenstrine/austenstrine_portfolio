# prefs-lint

Fail-closed process / Cursor-sync checks for portfolio preferences.

- Add checks as `*.check.sh` in this directory (exit 0 ok, nonzero fail).
- Runner: `./ops/tooling/prefs-lint/run.sh`
- Wired via `./bin/agent-cli lint` and root `npm run lint`

Do **not** put checks under `scripts/prefs-lint/`.
