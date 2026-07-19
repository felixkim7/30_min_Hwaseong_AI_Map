# Phase 10 — Transit Gap Reasoning

## Goal
Give the AI a genuinely different reasoning task, not another flavor of
text-summarization. For bus-related clusters, the policy report gains a section
where the model reasons about *why* the cluster's locations are underserved by
real transit — grounded in actual GBIS route/station data, not invented schedules.
This directly answers the "are we using AI enough?" and differentiation concerns in
`docs/PROJECT_BRIEF.md`.

## In scope
- Extend the transit-evidence lookup (`lib/transitEvidence.ts`, `lib/gbis.ts`) to
  also fetch which real bus routes serve each nearby station (`fetchRoutesAtStation`
  is already implemented for this) for a cluster's member locations.
- Compute, in code (not the LLM), a structured "coverage gap" summary: which of the
  cluster's distinct locations share a route with each other, and which don't. This
  structured data is what gets handed to the LLM as input — the model must not be
  asked to infer route coverage from scratch.
- Extend `/api/policy-report`'s prompt with this real gap data, adding a
  "대중교통 개선 제안" section to the generated report. The model may propose
  structural changes (new route direction, extend an existing route, add off-peak
  service) but must **not** invent specific frequencies, timetables, or vehicle
  counts it has no basis for.
- Render the new section wherever the rest of the policy report renders today (no
  new UI surface needed).

## Out of scope
- Any visual/map representation of a suggested route (phase 11).
- Real-time route planning or a routing engine — this is qualitative reasoning
  about coverage gaps, not turn-by-turn navigation.
- Applying this to non-bus clusters (교통약자/보행안전/도로정체 clusters with no
  real transit-route angle don't need this section).

## Prerequisites
- Phase 05 (clustering/scoring), phase 07 (policy report), and phase 08 (GBIS
  integration) complete. Builds directly on `lib/gbis.ts`'s existing
  `fetchNearbyStations` and `fetchRoutesAtStation`.

## Tasks
1. Add a function that, given a cluster's member reports, returns which real
   routes serve each distinct location and which locations share no route.
2. Wire this structured gap data into the `/api/policy-report` prompt.
3. Add the "대중교통 개선 제안" section to the report's fixed structure, with an
   explicit prompt rule against fabricating schedules/frequencies.
4. Gate this section to bus-related clusters only (reuse the same
   `transport_mode`/`sub_category` check already used to gate transit evidence in
   the cluster detail page).

## Acceptance criteria
- [ ] Every bus-related cluster's generated policy report includes a transit-gap
      section that cites real route numbers/station names actually returned by
      GBIS for that cluster.
- [ ] The section never states a specific frequency, schedule, or vehicle count the
      AI invented — recommendations are structural/qualitative only.
- [ ] Non-bus-related clusters do not get this section.
- [ ] `npm run build` passes.

## Prompt to give Claude Code
> Read CLAUDE.md, docs/PROJECT_BRIEF.md, and docs/phases/phase-10-transit-gap-reasoning.md.
> Do only phase 10. Compute real route-coverage gaps per cluster from GBIS data,
> feed that structured data into the policy report prompt, and add a
> "대중교통 개선 제안" section that reasons about the gap without inventing
> schedules. Stop at the acceptance criteria.

## Notes
- The credibility risk here is real: if the AI invents a specific bus interval or
  timetable, it contradicts our own stated defense ("the service does not decide
  policy, it surfaces candidate reviews for staff"). Keep recommendations
  structural, not operational.
- This is the cheaper, safer half of the route-recommendation idea. Phase 11 (map
  visualization) is the higher-payoff, higher-risk half — do this one first.
