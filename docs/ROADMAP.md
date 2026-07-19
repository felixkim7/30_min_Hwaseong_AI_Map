# Roadmap

We build one phase at a time. Each phase file in `docs/phases/` is a self-contained
unit with its own acceptance criteria.

## How to drive Claude Code, per phase

1. Start a session. Claude Code reads `CLAUDE.md` automatically.
2. Say: **"Let's do phase 0X. Read docs/phases/phase-0X-*.md and work only on that."**
3. Let it implement. When it says done, check the phase's "Acceptance criteria"
   yourself in the browser.
4. Commit (`git commit`) so each phase is an isolated, revertible step.
5. Start the next phase in a fresh message. Don't let it run ahead.

Keeping phases isolated is what makes the "time is on my side" advantage pay off:
each part gets built solidly and can be upgraded later without breaking the rest.

## Phases and dependencies

| # | Phase | File | Depends on | Goal |
|---|---|---|---|---|
| 00 | Scaffold & config | phase-00-scaffold-and-config.md | — | Runnable Next.js app, Supabase wired, deploys |
| 01 | Report input | phase-01-report-input.md | 00 | Citizen form (plain-language + fields) |
| 02 | AI classify + PII mask | phase-02-ai-classify-and-mask.md | 00, 01 | `/api/analyze` returns structured JSON, masks PII |
| 03 | Data layer | phase-03-data-layer.md | 00, 02 | Supabase schema + save/list reports |
| 04 | Map | phase-04-map.md | 03 | Reports plotted, filters, side panel |
| 05 | Clustering + scoring | phase-05-clustering-and-scoring.md | 03 | Merge duplicates, transparent priority score |
| 06 | Admin dashboard | phase-06-admin-dashboard.md | 05 | KPIs + ranked cluster list + detail |
| 07 | Policy report | phase-07-policy-report.md | 05, 06 | One-page auto report per cluster |
| 08 | Public-data integration | phase-08-public-data-integration.md | 05 | Real Gyeonggi transit data as evidence |
| 09 | Seed & demo polish | phase-09-seed-and-demo-polish.md | all | Seeded map/dashboard + a clean 2-min demo |
| 10 | Transit gap reasoning | phase-10-transit-gap-reasoning.md | 05, 07, 08 | AI reasons about real route-coverage gaps in the policy report |
| 11 | Route recommendation map overlay | phase-11-route-recommendation-map.md | 09, 10 | Visualize the suggested corridor on the cluster map |

## Suggested build order

Straight 00 → 09 for the core contest build. Two natural checkpoints:

- **MVP demoable (00–04 + a small seed from 09):** input → AI structuring → save →
  map. This alone is a working, showable product. Reach this first.
- **Full contest build (05–09):** the clustering, scoring, admin dashboard, auto
  policy report, and real public-data evidence — the parts that win the higher-value
  criteria and carry the live demo.

Phases 10–11 are optional creativity-boosting additions, added after the core build
was working and stable. They exist to push the 창의성 (creativity) and AI-usage
story further than "AI structures and summarizes text three different ways" — see
`docs/PROJECT_BRIEF.md`'s differentiation section. Only take these on once 00–09
are solid; do not let them put the core demo at risk.

## If time is short

Priority to protect, in order: 00, 01, 02, 03, 04, 07, 09, then 05/06, then 08.
A polished input→AI→map→auto-report path that runs flawlessly beats a broad build
that stutters during the live demo. Phases 10–11 come last, after everything above
is solid — 10 before 11, since 10 is cheaper and safer and 11 depends on it.
