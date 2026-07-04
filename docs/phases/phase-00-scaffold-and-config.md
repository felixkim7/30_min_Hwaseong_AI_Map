# Phase 00 — Scaffold & Config

## Goal
A runnable Next.js + TypeScript + Tailwind app with Supabase wired up, the folder
structure from ARCHITECTURE.md in place, and a Korean landing page that deploys to
Vercel.

## In scope
- `create-next-app` (App Router, TypeScript, Tailwind, ESLint).
- Folder skeleton: `app/`, `lib/`, `components/`, `supabase/migrations/`, `supabase/seed/`.
- Supabase clients: `lib/supabase/server.ts` (service-role, server only) and
  `lib/supabase/client.ts` (anon, browser).
- `lib/copy.ts` with a few Korean strings for the landing page.
- `.env.local` wired from `.env.example` (do not commit it).
- Landing page (`app/page.tsx`) with the Korean product name, a one-line pitch, and
  two buttons: "교통불편 제보하기" and "교통불편 지도 보기" (they can link to
  placeholder routes for now).

## Out of scope
- Any real form, map, AI call, or DB table. Those are later phases.

## Prerequisites
- A Supabase project created (I will provide URL + keys).

## Tasks
1. Scaffold the app and confirm `npm run dev` serves a page.
2. Add Tailwind base styles and a minimal responsive layout shell.
3. Create the two Supabase client helpers; make sure the service-role client is
   only importable server-side.
4. Build the Korean landing page.
5. Add `README.md` with local-run steps and (later) the live URL.

## Acceptance criteria
- [ ] `npm run dev` shows the Korean landing page at localhost:3000.
- [ ] `npm run build` passes with no type errors.
- [ ] Deploy to Vercel succeeds and the URL opens in Chrome.
- [ ] No secret uses a `NEXT_PUBLIC_` prefix; service-role key is server-only.

## Prompt to give Claude Code
> Read CLAUDE.md and docs/phases/phase-00-scaffold-and-config.md. Do only phase 00.
> Scaffold the app, wire Supabase clients, and build the Korean landing page.
> Do not create any DB tables, forms, maps, or AI routes yet. Stop when the
> acceptance criteria are met.

## Notes
- Keep the layout simple and clean; polish comes in phase 09.
- If Vercel/Supabase credentials aren't ready, still finish local scaffolding and
  flag what you need.
