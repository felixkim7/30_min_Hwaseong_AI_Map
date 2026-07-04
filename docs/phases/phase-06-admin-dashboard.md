# Phase 06 — Admin Dashboard

## Goal
The administrator view: KPI cards, a cluster list ranked by priority, and a cluster
detail screen. This is the screen to lead with if we enter the public-official
division.

## In scope
- Route `app/admin/page.tsx` (a simple gated route is fine — a shared passphrase or
  a Supabase-auth-protected page; keep auth minimal).
- KPI cards: 총 제보 수, 이번 주 신규 제보 수, 가장 많은 불편 유형, 가장 많이 언급된
  지역, 심야 교통 공백 제보 수, 교통약자 관련 제보 수.
- Cluster list sorted by `priority_score` (descending), each row showing title,
  district, report_count, sub_category, priority.
- Cluster detail: representative report + member reports + the visible
  `score_breakdown`.
- A couple of Recharts visuals (e.g. reports by type, reports by district).

## Out of scope
- Policy report generation (phase 07) — leave a "정책 검토 보고서 생성" button as a
  stub that phase 07 will implement.
- Real public data (phase 08).

## Prerequisites
- Phase 05 complete (clusters + scores exist).

## Tasks
1. Build the gated admin route.
2. Compute and render the KPI cards from the DB.
3. Render the ranked cluster list and cluster detail with the score breakdown.
4. Add the two charts.

## Acceptance criteria
- [ ] Dashboard reflects real DB data and the counts are correct.
- [ ] Clusters are sorted by priority; clicking one opens detail with member reports.
- [ ] The score breakdown is visible on cluster detail.
- [ ] The admin route is not publicly writable and holds no secret client-side.

## Prompt to give Claude Code
> Read CLAUDE.md and docs/phases/phase-06-admin-dashboard.md. Do only phase 06. Build
> the gated /admin dashboard: KPI cards, priority-ranked cluster list, cluster detail
> with score breakdown, and two Recharts visuals. Leave the report button as a stub.
> Stop at the acceptance criteria.

## Notes
- Keep gating simple; a heavy auth system is out of scope and eats demo time.
- The ranked list is the visual proof that we compress complaints into priorities —
  make it the centerpiece.
