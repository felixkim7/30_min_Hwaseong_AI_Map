# Phase 04 — Map

## Goal
The citizen-facing map: reports plotted on Hwaseong with filters and a side panel of
top issues. This is the "our neighborhood" view.

## In scope
- Route `app/map/page.tsx` using React-Leaflet + OpenStreetMap tiles, centered on
  Hwaseong.
- Fetch reports from `GET /api/reports` and plot them as markers (or a heatmap layer).
- Filters: 지역(구/읍면동), 교통수단, 시간대, 불편 유형, (later) 우선순위.
- Marker popups showing the masked summary, sub_category, time_pattern, severity.
- Side panel: "현재 가장 많이 제보된 이슈 TOP 5" (simple count-based ranking for now;
  real cluster ranking arrives with phase 05/06).
- Handle empty state gracefully ("아직 제보가 없습니다").
- Geocoding: if reports lack lat/lng, provide a lightweight place→coordinate mapping
  for known Hwaseong landmarks (동탄역, 병점역, 봉담, 향남, 남양, 비봉, 야목역 …) so
  markers appear. Keep this as a small local lookup table for the demo.

## Out of scope
- Clustering logic, priority scores, admin dashboard.

## Prerequisites
- Phase 03 complete (reports exist to plot).

## Tasks
1. Add React-Leaflet; render the base map (must load with no API key).
2. Load reports and place markers with popups.
3. Build the filter bar and wire it to the query.
4. Add the TOP-5 side panel and empty state.

## Acceptance criteria
- [ ] Map loads in Chrome with no console errors and no API key needed.
- [ ] Markers reflect reports in the DB; popups show masked content.
- [ ] Filters change what's shown.
- [ ] Empty state renders when there are no matching reports.

## Prompt to give Claude Code
> Read CLAUDE.md and docs/phases/phase-04-map.md. Do only phase 04. Build the Leaflet
> map, plot reports from /api/reports with popups and filters, and add a TOP-5 side
> panel with an empty state. No clustering or scoring yet. Stop at the acceptance
> criteria.

## Notes
- React-Leaflet needs client-side rendering; import the map dynamically with SSR off
  to avoid `window is not defined`.
- Concentrate seed data (phase 09) on a few hotspots so clusters are visible — a map
  with one pin per district looks empty.
