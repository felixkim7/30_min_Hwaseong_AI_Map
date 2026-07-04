# Phase 05 — Clustering + Scoring

## Goal
Turn scattered reports into a few ranked policy issues. Merge duplicates into
clusters and assign each a transparent priority score. This is the "not a complaint
board, a policy queue" differentiator.

## In scope
- `app/api/cluster/route.ts` (POST): group unclustered reports into clusters.
  - Start LLM-based: send batches of report summaries and ask the model to group
    ones describing the same underlying issue, returning a representative `title`
    and `summary` per group. Assign `cluster_id` on member reports and upsert
    `clusters` rows with `report_count` and `representative_report_id`.
  - Keep it deterministic enough to demo; do NOT build an embedding pipeline yet.
- `lib/scoring.ts`: implement the transparent weighted formula from ARCHITECTURE.md.
  Each factor 0–1, weights explicit, output 0–100 plus a `score_breakdown` object.
- `app/api/score/route.ts` (POST): compute/refresh `priority_score` and
  `score_breakdown` for clusters.
- Surface the breakdown wherever a cluster is shown (cluster detail comes in phase
  06, but the score + breakdown must be inspectable).

## Out of scope
- The admin dashboard UI (phase 06) and the policy report (phase 07).
- Embedding-based clustering — only if all later phases are done and time remains.

## Prerequisites
- Phase 03 (data) complete. Some reports available (seed a handful to test).

## Tasks
1. Implement `/api/cluster` with LLM grouping and persistence.
2. Implement `lib/scoring.ts` (pure function, unit-testable) and `/api/score`.
3. Store `score_breakdown` as JSON so the UI can show honest, per-factor values.

## Acceptance criteria
- [ ] Several near-duplicate sample reports collapse into a single cluster with a
      sensible representative title.
- [ ] Each cluster has a 0–100 priority score with a visible per-factor breakdown.
- [ ] Re-running clustering doesn't duplicate clusters uncontrollably (idempotent
      enough for a demo).
- [ ] `npm run build` passes.

## Prompt to give Claude Code
> Read CLAUDE.md, docs/ARCHITECTURE.md, and docs/phases/phase-05-clustering-and-scoring.md.
> Do only phase 05. Implement LLM-based clustering in /api/cluster, the transparent
> scoring function in lib/scoring.ts, and /api/score. Persist cluster_id and
> score_breakdown. Do not build the admin UI or the policy report. Stop at the
> acceptance criteria.

## Notes
- The score must come from the formula, not the model. The LLM may later *explain*
  a score in words (phase 07 report), but never invent the number.
- Transparency is a defense: showing the weighted breakdown answers "are these
  scores arbitrary?" in Q&A.
