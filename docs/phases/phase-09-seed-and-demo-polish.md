# Phase 09 — Seed & Demo Polish

## Goal
Make the app look alive and rehearse a flawless 2-minute demo. A judge should open
the URL and immediately see a populated map and dashboard, then watch the full flow
run without a hitch.

## In scope
- **Seed data:** 40–50 realistic sample reports in `supabase/seed/`, concentrated on
  a few hotspots so clusters are visible:
  - 동탄역 (연계버스/환승 대기), 비봉·야목역 (심야 공백/안전), 봉담 (출근버스 부족),
    향남 (병점역 접근성), plus a couple of congestion/pedestrian cases.
  - Reports must already be masked-style text (no PII), spread across time patterns
    and user types.
  - Include a seed script so the DB can be reset to a known demo state.
- **Polish:** empty states, loading states, error handling on every AI/API call,
  consistent Korean copy, mobile check, and a final Chrome + Edge pass.
- **README:** live URL, one-paragraph description, local-run steps, and the demo
  script below.
- **Demo script** (align with PROJECT_BRIEF, matches the 2-min live demo):
  1. Citizen submits a plain-language 동탄역 report.
  2. AI structures it + masks PII on the review screen.
  3. It appears on the map and joins the 동탄역 cluster.
  4. Admin dashboard shows the ranked TOP issues.
  5. One click generates the policy review report (with real transit evidence).

## Out of scope
- New features. This phase only seeds, hardens, and rehearses.

## Prerequisites
- Ideally phases 00–08. At minimum 00–04 + 07 for an MVP demo.

## Tasks
1. Author the seed reports and a reset/seed script.
2. Run clustering + scoring over the seed so the dashboard is pre-populated.
3. Add/verify empty, loading, and error states everywhere.
4. Test the full demo flow end to end in Chrome and Edge; fix anything that stutters.
5. Write the README with the live URL and demo script.

## Acceptance criteria
- [ ] A fresh load shows a populated map and a populated admin dashboard.
- [ ] The 5-step demo runs end to end with no console errors in Chrome and Edge.
- [ ] Every AI/API call has a loading state and a graceful failure path.
- [ ] README contains the live URL, description, run steps, and demo script.

## Prompt to give Claude Code
> Read CLAUDE.md and docs/phases/phase-09-seed-and-demo-polish.md. Do only phase 09.
> Create 40–50 realistic seed reports concentrated on a few hotspots plus a seed
> script, run clustering/scoring over them, harden loading/empty/error states, and
> verify the full demo flow in Chrome and Edge. Write the README with the demo
> script. Stop at the acceptance criteria.

## Notes
- Concentrated seed data is what makes clusters and the map look real — do not spread
  reports thinly.
- Rehearse the demo against the deployed URL, not just localhost. Judges use the
  deployed URL.
