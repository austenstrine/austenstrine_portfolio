# Agent docs (on-demand)

Canonical long-form guidance relocated from always-on Cursor rules. Thin `.cursor/rules/*.mdc` point here.

| Doc | When |
|-----|------|
| [graphify.md](./graphify.md) | Architecture / call-graph; hard: before wide Grep; `./bin/agent-cli graphify` |
| [local-first.md](./local-first.md) | Where to edit; sync after `development` push |
| [dssh-launch.md](./dssh-launch.md) | Day-to-day local stack bring-up |
| [dssh-backend-ownership.md](./dssh-backend-ownership.md) | Restart Nest API / CRM |
| [tiny-copy-doer-adversary.md](./tiny-copy-doer-adversary.md) | Exact ≤~2-sentence copy drop-ins |
| [show-dont-tell.md](./show-dont-tell.md) | UI copy — no coaching |
| [viewport-testing.md](./viewport-testing.md) | Layout viewport bands / devices |
| [shell-timing-hooks.md](./shell-timing-hooks.md) | Host Shell SLOW/LOOP warnings |
| [out-of-scope-handoff.md](./out-of-scope-handoff.md) | Missing repo/env/forge access |
| [agent-coord.md](./agent-coord.md) | Same-checkout multi-agent file claims |
| [new-chat-on-drift.md](./new-chat-on-drift.md) | Subject drift → new chat ask |
| [context-compress.md](./context-compress.md) | Large context → RTK / ContextPrune / caveman-compress (`./bin/context-compress`) |
| [ultracave-kickoff.md](./ultracave-kickoff.md) | Coordinator paste block — prepend to every CreateAgent / SendToAgent / Task kickoff |
| [cookie-epoch.md](./cookie-epoch.md) | Session/cookie work: bump `COOKIE_EPOCH_UTC` in `apps/web/src/lib/cookie-epoch.ts`; stamp `pem_cookie_epoch` |
| [subagent-watchdog.md](./subagent-watchdog.md) | Coordinator stuck-loop poll (1 min while workers active); `./bin/subagent-watchdog` |
| [host-softlock-watch.md](./host-softlock-watch.md) | Always-on host softlock killer; systemd install + metrics |
| Skill `watchdog` | `~/.agents/skills/watchdog/SKILL.md` — params/metrics; hooks own start |
| Project hooks | `.cursor/hooks.json` — sessionStart graphify+watchdog; Task/subagentStart reminders |

Also: `docs/code-style-preferences.md`, `docs/git-commit-preferences.md`, `docs/cursor-rules-progressive-disclosure.md`, `docs/context-compress-tooling.md`.

**Voice:** ultracave mandatory for every agent/worker/subagent via `.cursor/rules/voice-modes.mdc` (alwaysApply; skill attach not required). Coordinators MUST prepend `docs/agent/ultracave-kickoff.md`. Opt out: “stop caveman” / “normal mode” / “stop ultracave”.
