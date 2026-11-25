# Tailored `/for/[slug]` homepage

One homepage shell (`HomepageShell`). `/` = default tailor. `/for/[slug]` = same shell + overlay.

## Add a target

1. Skill map the JD (truth-only). Prefer Project `internal/` notes.
2. Register in `apps/web/src/data/for-targets.ts` → `FOR_TARGETS`:
   - `slug`
   - `headline` (framing title; not a fake employer title claim)
   - `blurb` (evidenced overlap only; `LOREM_IPSUM:<id>` + this map if gaps)
   - `skillSet` (`SkillTag[]` from `experience-skills.ts`)
   - optional `preExpandHighlightIds` (default = reverse-inheritance match on `skillSet`)
3. Tag experience highlights/details in `experience.ts` so match can find them.
4. Unknown slug → **404** (`notFound()`), not silent default home.

## Schema sketch

```
HomepageTailorConfig {
  headline, blurb,
  skillSet: SkillTag[],
  preExpandHighlightIds: string[]
}

ExperienceRole { tags?, highlights: ExperienceHighlight[] }
ExperienceHighlight { id, summary, tags?, details: ExperienceDetail[] }
ExperienceDetail { id, text, tags? }  // leaf; tags bubble up
```

Reverse inheritance: detail → highlight → role. Siblings do not inherit sideways.

## Owned paths (this land)

- Shell/UI: `HomepageShell`, `HeroSection`, `ExperienceSection`, `homepage-tailor`, `app/page.tsx`, `app/for/[slug]/`
- Data (already started here — not under `data/for/`): `experience.ts`, `experience-skills.ts`, `for-targets.ts`
- Docs: this file + `lorem-ipsum-map.md`

`apps/web/src/data/for/` left free for sibling config splits if desired later.
