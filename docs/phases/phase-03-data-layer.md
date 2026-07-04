# Phase 03 — Data Layer

## Goal
Persist confirmed, masked reports in Supabase and read them back. This closes the
loop: input → AI → save → list.

## In scope
- SQL migration in `supabase/migrations/` creating `reports`, `clusters`,
  `policy_reports` per ARCHITECTURE.md. Store lat/lng as numeric columns (no PostGIS).
- Row Level Security:
  - anonymous INSERT into `reports` (public reporting via anon client),
  - public SELECT on `reports` (map needs to read),
  - `clusters` / `policy_reports` writes only via server (service-role).
- `app/api/reports/route.ts`:
  - `POST` → validate with zod, save the **masked** report.
  - `GET` → list with optional filters (district, transport_mode, time_pattern,
    sub_category).
- Wire "이대로 등록" from the phase-02 review screen to actually save, then show a
  success state.

## Out of scope
- Map rendering (phase 04), clustering/scoring (phase 05).

## Prerequisites
- Phases 00–02 complete.

## Tasks
1. Write and apply the migration; verify tables + RLS in Supabase.
2. Implement `/api/reports` POST/GET with zod validation.
3. Connect the review screen's confirm action to POST.
4. Add a temporary `/map`-less list view (or JSON dump) to confirm reads work.

## Acceptance criteria
- [ ] A confirmed report persists in `reports` and comes back via `GET /api/reports`.
- [ ] Stored rows contain masked text only — no raw PII.
- [ ] RLS lets anonymous users insert + read reports but not touch clusters.
- [ ] `npm run build` passes.

## Prompt to give Claude Code
> Read CLAUDE.md, docs/ARCHITECTURE.md, and docs/phases/phase-03-data-layer.md.
> Do only phase 03. Create the migration (reports, clusters, policy_reports) with
> RLS, implement /api/reports GET/POST, and wire the review screen's confirm to
> save. Store masked text only. Stop at the acceptance criteria.

## Notes
- Double-check RLS: a common mistake is exposing writes too broadly. Anonymous users
  may insert reports but must not modify clusters/scores.
- Keep the schema close to ARCHITECTURE.md so later phases don't need migrations
  churn.
