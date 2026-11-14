# eslint-plugin-portfolio-prefs

Single ESLint plugin for portfolio / Place et Marque UI preference rules (swarm Angle B).

Rule ids: `portfolio-prefs/<kebab-name>`. Do not fork a second plugin.

## Configs

- `recommended` — fail-closed defaults (wired via root `eslint.config.mjs`)
- `strict` — also enables baseline-debt rules (`no-dynamic-tailwind-class`, `no-micromobile-gutter-pile`)

## Rules

| Rule | recommended | Preference |
|------|-------------|------------|
| `no-slug-in-ui-copy` | error | No “slug” jargon in UI copy |
| `no-king-and-i` | error | Never list The King and I on CV |
| `inplace-edit-default-off` | error | In-place edit defaults to off |
| `no-raw-svg-in-pages` | error | Icons under `components/icons/` |
| `session-aware-sign-in` | error | Account hub `page.tsx` uses `RequireAccess` |
| `no-sketch-parens` | error | No `(change >)` sketch strings |
| `no-directional-caret` | error | ArrowLeft/Right icons; no lone ›/←/→ text |
| `no-ink-as-surface` | error | No `bg-ink` / gradient ink fills |
| `action-cluster-right-align` | warn | `data-pem-actions` → `justify-end` / `ml-auto` |
| `mobile-icon-only-actions` | warn | `data-pem-action` hides label on mobile |
| `seller-chrome-no-cart` | warn | Cart gated in CatalogHeader chrome |
| `no-micromobile-gutter-pile` | off (strict: warn) | Use `gutter`; no piled `max-[399px]:px-*` |
| `no-dynamic-tailwind-class` | off (strict: warn) | Static `className` literals |

## Opt-in attributes

- `data-pem-actions` — CTA/action cluster container
- `data-pem-action` — individual action control
- `data-pem-allow-micromobile-px` — escape hatch for allowed micromobile `px-*`

## Smoke

```bash
node packages/eslint-plugin-portfolio-prefs/tests/run-rule-smoke.js
```
