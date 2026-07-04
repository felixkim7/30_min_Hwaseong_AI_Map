# Phase 07 — Policy Report

## Goal
The flagship demo moment: one click turns a cluster into a one-page policy review
report an administrator could actually use. "Citizen inconvenience" becomes a
"policy review document" on screen.

## In scope
- `app/api/policy-report/route.ts` (POST `{ cluster_id }`): gather the cluster's
  reports + score breakdown, prompt the LLM to produce a structured Korean markdown
  report, persist it to `policy_reports`, and return it.
- Report structure (Korean headings):
  현황 / 반복 제보 요약 / 문제 원인 추정 / 단기 개선안 / 중장기 검토안 /
  관련 시정 방향 / 기대효과.
  - "관련 시정 방향" should reference current city directions where relevant
    (30분 생활권, 광역·급행버스, 심야 안전귀가, 순환철도) — but grounded in the
    cluster's data, not generic boilerplate.
- Render the report in the admin cluster detail with 복사 / 다운로드(.md) buttons.

## Out of scope
- Real public-data evidence (phase 08) — the report can note where such evidence
  would attach; phase 08 fills it in.

## Prerequisites
- Phases 05–06 complete.

## Tasks
1. Implement `/api/policy-report` with a strong, structured prompt fed by real
   cluster data.
2. Persist and render the markdown; add copy/download.
3. Replace the phase-06 stub button with the working generator.

## Acceptance criteria
- [ ] Clicking "정책 검토 보고서 생성" on a cluster produces a coherent Korean report
      that references that cluster's actual reports, location, and score.
- [ ] The report follows the fixed section structure above.
- [ ] The report can be copied and downloaded as markdown.
- [ ] Generation handles the LLM being slow (loading state) and failing (retry/error).

## Prompt to give Claude Code
> Read CLAUDE.md, docs/PROJECT_BRIEF.md, and docs/phases/phase-07-policy-report.md.
> Do only phase 07. Implement /api/policy-report to turn a cluster into a structured
> one-page Korean markdown report grounded in that cluster's data, persist it, and
> render it with copy/download in the admin detail view. Stop at the acceptance
> criteria.

## Notes
- This is the highest-impact 30 seconds of the live demo. Make the output look like
  a real administrative document, not a chatbot answer.
- Keep the report tied to the cluster's data so it can't be dismissed as generic AI
  text.
