# Phase 02 — AI Classify + PII Mask

## Goal
The core AI step. A server-side route takes the citizen's text and returns a
structured JSON object with PII removed. Add a "review before submit" screen so the
citizen confirms the AI's interpretation.

## In scope
- `lib/llm.ts`: provider-agnostic server-only LLM call driven by `LLM_PROVIDER`.
- `lib/schema.ts`: zod schema for the AI output (extends `ReportInput`):
  `{ masked_text, category, sub_category, problem_types[], location_name, time_pattern,
  transport_mode, severity, target_groups[], summary, suggested_policies[] }`.
- `app/api/analyze/route.ts` (POST): builds a strict prompt, calls the LLM, and
  returns **only** validated JSON.
  - Prompt the model to output JSON only (no prose, no code fences).
  - Parse defensively: strip fences, `JSON.parse`, validate with zod, retry once on
    failure, return a clear error if it still fails.
  - **PII masking**: instruct the model to remove names, phone numbers, apartment
    building/unit numbers, and plate numbers, replacing them with neutral wording.
    Produce `masked_text`. The route must never return or store the raw text.
- Wire the phase-01 form → `/api/analyze` → a review screen showing the structured
  result and the masked text, with "이대로 등록 / 수정하기" buttons. (Register/save
  is implemented in phase 03; for now "이대로 등록" can be a stub.)

## Out of scope
- Saving to Supabase (phase 03), map, clustering.

## Prerequisites
- Phases 00–01 complete. LLM key set in `.env.local`.

## Tasks
1. Implement `lib/llm.ts` with the chosen provider; keep it server-only.
2. Write the classification+masking prompt; return strict JSON.
3. Implement `/api/analyze` with defensive parsing and one retry.
4. Add the review screen and connect the form to the route.

## Acceptance criteria
- [ ] Given a sample sentence, the route returns valid JSON matching the zod schema.
- [ ] PII (phone, name, building/unit, plate) is masked in `masked_text`.
- [ ] The LLM key is NOT present in any client bundle (server-only route).
- [ ] The citizen sees a review screen and can edit before confirming.
- [ ] Malformed model output is handled gracefully (retry, then friendly error).

## Prompt to give Claude Code
> Read CLAUDE.md, docs/ARCHITECTURE.md, and docs/phases/phase-02-ai-classify-and-mask.md.
> Do only phase 02. Implement lib/llm.ts, the zod schema, and /api/analyze with PII
> masking and strict-JSON parsing, then add the review screen. Keep the key
> server-side. Do not save to the DB yet. Stop at the acceptance criteria.

## Notes
- This is the feature that gets attacked in Q&A. Make masking visibly work in the
  demo — it's a strong "public-service" talking point.
- Test with messy input: typos, mixed content, embedded phone numbers.
