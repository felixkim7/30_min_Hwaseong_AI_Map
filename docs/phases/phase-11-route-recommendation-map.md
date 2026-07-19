# Phase 11 — Route Recommendation Map Overlay

## Goal
Make the transit-gap recommendation from phase 10 visible and spatial instead of
only prose. A judge sees an AI-suggested corridor drawn on the same map that
already shows the cluster's real report locations — the single strongest
creativity/demo payoff of the three route-recommendation phases, since nothing
else in the product is a visual, spatial AI output.

## In scope
- Compute a suggested corridor connecting a cluster's distinct, underserved
  locations (from phase 10's gap data) — an ordered set of waypoints, not a real
  routed path. No routing engine; a sensible ordering of the cluster's own
  coordinates is enough.
- Extend `components/ClusterMap.tsx` to optionally render this corridor as a
  polyline (Kakao Maps SDK's `Polyline` via `react-kakao-maps-sdk`), visually
  distinct from the existing report markers (e.g. dashed, different color).
- Wire the cluster detail page (`app/admin/clusters/[id]/page.tsx`) to pass the
  computed corridor into `ClusterMap` for bus-related clusters that have a
  meaningful gap (per phase 10's output).
- Add a small caption/legend clarifying this is an AI-suggested corridor for
  administrative review, not a finalized or engineered route.

## Out of scope
- Real road-network routing (the line does not need to follow actual streets).
- Applying this to clusters where phase 10 found no meaningful coverage gap, or to
  non-bus clusters.
- Any new page — this extends the existing cluster detail map, no new route.

## Prerequisites
- Phase 10 complete (the gap data this phase visualizes must already exist).
- Phase 09's `ClusterMap`/Kakao Maps SDK integration in place.

## Tasks
1. Derive a waypoint ordering from the cluster's gap data (e.g. cluster the
   distinct locations into "already connected" vs. "isolated" groups, and propose
   connecting them in a sensible order).
2. Add polyline rendering support to `ClusterMap`.
3. Wire it into the cluster detail page, gated to clusters with a real gap.
4. Visually verify in a real browser (Chrome and Edge) that the line renders
   sensibly for at least one real multi-location cluster (e.g. 봉담읍) and does not
   look absurd for oddly-shaped or sparse clusters — check this by eye, not just by
   confirming the code runs.

## Acceptance criteria
- [ ] At least one bus-related cluster's detail page shows a visible AI-suggested
      corridor overlay connecting real report locations.
- [ ] The overlay is clearly labeled as a suggestion for review, not a confirmed or
      engineered route.
- [ ] The map (markers + overlay) renders correctly in Chrome and Edge.
- [ ] `npm run build` passes.

## Prompt to give Claude Code
> Read CLAUDE.md, docs/PROJECT_BRIEF.md, and docs/phases/phase-11-route-recommendation-map.md.
> Do only phase 11. Derive a suggested corridor from phase 10's gap data, render it
> as a polyline overlay on the existing cluster map, and gate it to clusters with a
> real coverage gap. Verify visually in a real browser, not just via build/lint.
> Stop at the acceptance criteria.

## Notes
- This phase has more design risk than most: a straight or naively-ordered line
  across a real cluster's scattered points can look insightful or can look silly
  depending on the cluster's actual shape. Do a visual gut-check early against real
  seed data before considering this "working."
- Keep the caption honest about what this is (a suggestion for staff review) — the
  same "AI does not decide policy" framing used elsewhere in the product.
