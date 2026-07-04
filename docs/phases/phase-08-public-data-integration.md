# Phase 08 — Public-Data Integration

## Goal
Attach real public data to at least one or two issues so the service reads as a live,
data-connected tool rather than pure LLM output. This is where technical-completeness
points and the "are the suggestions grounded?" defense are earned.

## In scope
- `app/api/transit/route.ts`: server-side proxy for a Gyeonggi open API — bus arrival
  info (경기도 버스도착정보) and/or road traffic/congestion (도로 소통 정보). Key is
  server-only (`GYEONGGI_DATA_API_KEY`).
- For at least one cluster (e.g. a 동탄역 연계버스 issue), show real evidence next to
  the citizen reports: current bus arrival/headway or road congestion near the
  location.
- **Demo safety net:** cache a fallback JSON snapshot and serve it if the upstream is
  down or rate-limited, so the live demo never fails on a network hiccup. Label
  clearly when showing cached vs live.
- Surface the evidence in the cluster detail and (optionally) inside the phase-07
  report as a "실측 데이터 근거" section.

## Out of scope
- Full real-time coverage for every report. One or two well-chosen, working examples
  are enough and more convincing than broad-but-flaky coverage.

## Prerequisites
- Phase 05 complete; a registered Gyeonggi/data.go.kr API key in `.env.local`.

## Tasks
1. Register for the API key (I will handle registration; you consume the key from env).
2. Implement the `/api/transit` proxy with caching + fallback.
3. Wire real evidence into one or two clusters' detail views.
4. Optionally add the "실측 데이터 근거" section to the generated report.

## Acceptance criteria
- [ ] At least one cluster shows real public-data evidence fetched server-side.
- [ ] The Gyeonggi API key is never exposed to the browser.
- [ ] If the upstream API fails, the UI degrades to cached data instead of breaking.
- [ ] `npm run build` passes.

## Prompt to give Claude Code
> Read CLAUDE.md, docs/ARCHITECTURE.md, and docs/phases/phase-08-public-data-integration.md.
> Do only phase 08. Implement a server-side /api/transit proxy for a Gyeonggi open API
> with caching and a fallback snapshot, and attach real evidence to one or two
> clusters. Keep the key server-side. Stop at the acceptance criteria.

## Notes
- Pick endpoints you can actually get working quickly; a single reliable example beats
  three half-working ones.
- The fallback snapshot is not cheating — it's demo insurance. Just label it honestly.
