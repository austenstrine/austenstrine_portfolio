# Prisma Seed Migration Sync

A tool that keeps the structural shape of intentional Prisma seed data in
sync with **Prisma migrations**. It replays pending migration SQL onto JSON
seed files, records which migrations have already been applied to those
files, and leaves seed logic alone.

It does not generate new rows, invent values, or replace `prisma/seed.ts`.

## What it does

- Compares Prisma migration folders to the list of migrations already applied
  to seed data.
- Replays only the **pending** migrations onto opted-in seed data files:
  - `ALTER TABLE ... ADD COLUMN` — add the field (migration default, `null`
    for nullable, or a placeholder)
  - `ALTER TABLE ... RENAME COLUMN` / `RENAME TO`
  - `ALTER TABLE ... DROP COLUMN` — remove the field
  - `ALTER TYPE ... RENAME VALUE` — rename matching string values
- Preserves existing intentional values. It only changes structure.
- Prints a summary of pending migrations and every edit so you can review
  the diff.
- Dry-run mode writes nothing.

It will **not**:

- Generate or regenerate seed rows (including from `CREATE TABLE`)
- Invent values beyond migration defaults or placeholders
- Rewrite loops, computed objects, or other seed logic
- Run as part of `prisma migrate`
- Diff against `schema.prisma` (migrations are the source of change)
- Decide whether the resulting data is correct

## Layout

Seed **data** lives in JSON files. Seed **logic** stays in `prisma/seed.ts`.

```
prisma/
  migrations/
  seed.ts
  seed-data/
    seed-sync.config.json
    CatalogCategory.json
    Project.json
    Secrets.json           # excluded in this app's config
```

`seed-sync.config.json`:

```json
{
  "pack": "my-app-seed",
  "schema": "../schema.prisma",
  "migrations": "../migrations",
  "omitFields": ["id", "createdAt", "updatedAt"],
  "placeholder": "__SEED_TODO__",
  "skipFiles": ["Secrets.json"],
  "appliedMigrations": []
}
```

`appliedMigrations` is the ledger. The tool updates it when you run `sync`.
An empty list with existing seed files **baselines** current migrations
(marks them applied without replaying history). After that, only new
migrations are applied to the JSON.

Every `*.json` file in the directory except the config is a seed data file.
Maintenance is **on by default**. To leave a file alone, list it in
`skipFiles` and/or set `"maintain": false` on that file. The tool does not
infer which files to skip.

```json
{
  "$prismaJsonSeed": {
    "format": "tree",
    "model": "CatalogCategory",
    "identityField": "slug",
    "parentRelation": "parent"
  },
  "records": [
    {
      "slug": "electronics",
      "name": "Electronics",
      "children": [
        { "slug": "headphones", "name": "Headphones" }
      ]
    }
  ]
}
```

## Intended use

1. Change and apply the Prisma schema with Prisma Migrate as usual.
2. Run this tool against the seed data directory (`--dry-run` first if you
   want).
3. Review the summary and the git diff. Fill in any `__SEED_TODO__`
   placeholders.
4. Commit. Git is the undo mechanism if the result is wrong.

```bash
npx prisma-seed-migration-sync sync --dir prisma/seed-data --dry-run
npx prisma-seed-migration-sync sync --dir prisma/seed-data
npx prisma-seed-migration-sync validate --dir prisma/seed-data
```

`applySeedDataIfNeeded({ prisma, seedDir })` belongs in `prisma/seed.ts` or
app boot. It upserts opted-in JSON rows into the database. It does **not**
replay migrations onto the files.

## Scope

In scope:

- JSON seed data files whose rows would be passed to Prisma `create`,
  `createMany`, or `upsert`
- Top-level model data and straightforward nested create/connect relations
- Changes driven by Prisma migrations
- Dry-run mode and a human-readable summary
- Opt-in execution: you decide when to run it and you review the result

Out of scope:

- Generating seed data
- Complex dynamic seed logic
- Hooking into `prisma migrate`
- Every Prisma relation pattern or advanced type change
