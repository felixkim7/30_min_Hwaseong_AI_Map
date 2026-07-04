# CLAUDE.md — 30-Minute Hwaseong AI Map

This file is auto-loaded by Claude Code at the start of every session. Read it fully
before doing anything. It defines how we work, the non-negotiable rules, and where
to find deeper specs.

---

## What this project is

A web service for the **2026 Hwaseong City Citizen & Public-Official AI Contest**
(화성시 시민·공무원 AI 공모전, Part 1 of the "AI 화성 챌린지").

Citizens describe traffic inconveniences in plain Korean. The app uses an LLM to
structure each report, mask personal information, plot it on a map, cluster
duplicate issues, score them by policy priority, and auto-generate a one-page
policy review report for city administrators.

Korean product name: **30분 화성 AI 맵**. Code/repo name: `hwaseong-ai-map`.

Full context: `docs/PROJECT_BRIEF.md`. Technical spec: `docs/ARCHITECTURE.md`.

---

## How we work — READ THIS

**We build one phase at a time. Do NOT scaffold the whole app in a single pass.**

- All phases live in `docs/phases/`. Each file is a self-contained unit of work
  with its own scope and acceptance criteria.
- At the start of a session I will tell you which phase to work on, e.g.
  "Let's do phase 04". Open `docs/phases/phase-04-map.md` and work ONLY on that.
- Do not start work described in a later phase, even if it seems convenient.
  If something in the current phase depends on missing earlier work, stop and
  tell me instead of building ahead.
- When a phase is done, confirm every item in its "Acceptance criteria" list,
  then stop and wait. Do not auto-advance to the next phase.

Phase order and dependencies are in `docs/ROADMAP.md`.

---

## Golden rules (non-negotiable)

1. **No secret ever reaches the browser.** LLM keys, the Supabase service-role key,
   and public-data API keys are used ONLY inside server code (Next.js Route
   Handlers under `app/api/`). Never put a real key in client components, and never
   prefix a secret with `NEXT_PUBLIC_`. The contest rules explicitly forbid API
   keys / secrets in submitted materials — a leak can disqualify us.
2. **Mask PII before storing.** We store the *masked* version of a report, not the
   raw text. Phone numbers, real names, apartment building/unit numbers, and plate
   numbers must be removed. See phase 02.
3. **It must run in a plain browser with zero install.** Judges open a URL in
   Chrome / Edge and expect it to work immediately. If a feature can't be
   demonstrated live in the browser, it doesn't count. Prefer "works" over "clever".
4. **Prototype scope, real integration where it matters.** Keep each part small and
   working. Do NOT over-engineer. But do wire real AI calls and (in phase 08) real
   public data, because that is where technical-completeness points are earned.
5. **Ask before adding dependencies or changing the agreed stack.** The stack in
   `docs/ARCHITECTURE.md` is deliberate. Don't swap Supabase for something else,
   don't add a vector DB, don't introduce PostGIS. If you think a change is needed,
   propose it and wait.

---

## Language convention

- **Code, comments, commit messages, file names, variable names: English.**
- **All user-facing UI copy: Korean.** The app is for Korean citizens and Korean
  judges. Buttons, labels, placeholders, error messages, and generated reports are
  in Korean. Keep Korean strings in a small central place (e.g. `lib/copy.ts`) so
  they are easy to review.

---

## Tech stack (summary — details in ARCHITECTURE.md)

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres) for data — one database, no PostGIS
- LLM calls via server-side Route Handlers only (provider chosen in `.env`)
- Map: React-Leaflet + OpenStreetMap tiles (no API key needed)
- Charts: Recharts
- Deploy: Vercel (app + serverless API routes), Supabase for DB

---

## Commands

```bash
npm run dev      # local dev server (http://localhost:3000)
npm run build    # production build — must pass before we consider a phase done
npm run lint     # lint; fix warnings you introduce
```

## Environment

Copy `.env.example` to `.env.local` and fill values. Never commit `.env.local`
(it is gitignored). Variable meanings are documented in `.env.example` and
`docs/ARCHITECTURE.md`.

---

## Definition of done (applies to every phase)

- `npm run build` passes with no type errors.
- The feature works in Chrome with no red errors in the console.
- UI copy is Korean; code is English.
- No secret is present in any client-side bundle.
- Every item in the phase's "Acceptance criteria" is checked off.

When these hold, summarize what changed and stop.
