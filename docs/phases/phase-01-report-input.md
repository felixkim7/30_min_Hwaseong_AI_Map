# Phase 01 — Report Input

## Goal
The citizen-facing report form: a natural-language box plus a few simple fields.
No saving and no AI yet — this phase produces a validated payload only.

## In scope
- Route `app/report/page.tsx`.
- One large textarea: "어떤 교통 불편을 겪으셨나요?" (plain-language input).
- Required fields:
  - 위치/장소명 (text input; a simple text field is fine for now — real geocoding
    can come with the map phase)
  - 자주 발생하는 시간대 (select: 평일 출근 / 평일 퇴근 / 주말 / 심야 / 상시 …)
  - 교통수단 (select: 버스 / 지하철·철도 / 자동차 / 보행 / 택시 / 기타)
- Optional fields: 이용자 유형 (직장인/학생/고령자/장애인/보호자), 체감 불편도 1–5,
  사진 첨부 (UI only for now).
- Client-side validation with Korean error messages.
- On submit: assemble a typed payload and (for now) `console.log` it / show it on a
  temporary preview panel. Wiring to `/api/analyze` happens in phase 02.
- Mobile-friendly responsive layout.

## Out of scope
- LLM analysis, PII masking, saving to DB, the map. Later phases.

## Prerequisites
- Phase 00 complete.

## Tasks
1. Build the form with controlled inputs and a shared types file
   (`lib/schema.ts` — start the `ReportInput` type here).
2. Validate required fields; show inline Korean errors.
3. Keep all Korean copy in `lib/copy.ts`.
4. Produce the typed payload on submit and display it in a temporary preview block.

## Acceptance criteria
- [ ] Form renders in Korean and is usable on a phone-width screen.
- [ ] Required-field validation blocks submit with clear Korean messages.
- [ ] Submitting logs/shows a well-typed payload object.
- [ ] `npm run build` passes.

## Prompt to give Claude Code
> Read CLAUDE.md and docs/phases/phase-01-report-input.md. Do only phase 01.
> Build the citizen report form with validation and a temporary preview of the
> payload. Do NOT call any AI or save anything yet. Stop at the acceptance criteria.

## Notes
- Keep the required fields minimal — friction kills participation, and the demo
  should be fast to fill in.
- Define `ReportInput` cleanly now; phase 02 will extend the shape with AI output
  fields.
