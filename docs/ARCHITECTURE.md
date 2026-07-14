# Architecture

Deliberate, minimal, demoable. Do not deviate without asking (see CLAUDE.md rule 5).

## Stack decisions and why

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One project hosts both the UI and the server API routes that hide our keys |
| Styling | Tailwind CSS | Fast, consistent, no design system overhead |
| Database | Supabase (Postgres) | One managed DB with auth + auto REST. Enough for a participatory app; supports the "continuity" story. **No PostGIS** — store lat/lng as plain numeric columns and do proximity/clustering in app code or via the LLM |
| AI | Server-side Route Handlers (`app/api/`) calling the chosen LLM | Keeps the key off the client (rule 1). Provider selected via `LLM_PROVIDER` |
| Map | React-Leaflet + OpenStreetMap tiles | Zero API key → guaranteed to load in the judge's browser. Kakao Map is an optional swap later |
| Charts | Recharts | Simple dashboard KPIs |
| Deploy | Vercel (app + API routes) + Supabase | Single-command deploy; serverless functions double as our key-hiding proxy |

We intentionally avoid a vector database and heavy ML infra. Clustering starts
LLM-based (phase 05). Only if time remains do we upgrade to embeddings — never
before everything else works end to end.

## Data flow

```
Citizen types plain-Korean report
        │
        ▼
POST /api/analyze        (server → LLM)
  • strips/masks PII
  • returns structured JSON + masked_text
  • DOES NOT save
        │
        ▼
Review screen (citizen confirms/edits)
        │
        ▼
POST /api/reports        (server → Supabase)
  • saves masked report only
        │
        ▼
Map + list read from Supabase
        │
        ▼ (admin)
POST /api/cluster  → group duplicates
POST /api/score    → transparent priority score
POST /api/policy-report → 1-page report per cluster
GET  /api/transit  → real public-data evidence (phase 08)
```

## Folder structure (target)

```
hwaseong-ai-map/
├─ CLAUDE.md
├─ .env.example
├─ .gitignore
├─ docs/                      # specs — do not ship, but keep in repo
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                # citizen landing
│  ├─ report/page.tsx         # report input (phase 01)
│  ├─ map/page.tsx            # public map (phase 04)
│  ├─ admin/page.tsx          # dashboard (phase 06)
│  └─ api/
│     ├─ analyze/route.ts     # phase 02
│     ├─ reports/route.ts     # phase 03 (GET list, POST create)
│     ├─ cluster/route.ts     # phase 05
│     ├─ score/route.ts       # phase 05
│     ├─ policy-report/route.ts # phase 07
│     └─ transit/route.ts     # phase 08
├─ lib/
│  ├─ supabase/server.ts      # service-role client (server only)
│  ├─ supabase/client.ts      # anon client (browser)
│  ├─ llm.ts                  # provider-agnostic LLM call (server only)
│  ├─ schema.ts               # zod types for the report JSON
│  ├─ scoring.ts              # transparent weighted formula
│  └─ copy.ts                 # centralized Korean UI strings
├─ components/                # shared UI
└─ supabase/
   ├─ migrations/             # SQL schema
   └─ seed/                   # sample reports (phase 09)
```

## Data model

Store the **masked** text, never raw PII.

### `reports`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| created_at | timestamptz default now() | |
| masked_text | text | PII already removed |
| category | text | always "교통" for the pilot |
| sub_category | text | e.g. 버스 배차, 환승, 심야귀가, 도로정체, 보행안전, 교통약자 |
| problem_types | text[] | |
| location_name | text | |
| lat | numeric | |
| lng | numeric | |
| district | text | 읍면동 / 구 |
| time_pattern | text | e.g. 평일 퇴근시간 |
| transport_mode | text | 버스 / 철도 / 자동차 / 보행 / 택시 / 기타 |
| severity | int | 1–5 |
| target_groups | text[] | 직장인, 학생, 고령자, 장애인, 보호자 … |
| summary | text | one-line AI summary |
| suggested_policies | text[] | AI candidate suggestions |
| cluster_id | uuid null | fk → clusters |
| status | text | new / clustered / reviewed |

### `clusters`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| created_at / updated_at | timestamptz | |
| title | text | representative issue name |
| summary | text | AI summary of the group |
| district | text | |
| report_count | int | |
| representative_report_id | uuid | |
| priority_score | numeric | 0–100 |
| score_breakdown | jsonb | per-factor values + weights (shown to user) |

### `policy_reports`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| cluster_id | uuid fk | |
| created_at | timestamptz | |
| content_md | text | generated markdown report |

RLS: allow anonymous INSERT into `reports` via the anon client (public reporting)
and public SELECT for the map. Admin/cluster/score/report writes go through server
routes using the service-role key.

## API route contracts

- `POST /api/analyze` → body `{ text, location_name?, lat?, lng?, time_pattern?, transport_mode?, ... }`
  → `{ masked_text, category, sub_category, problem_types, summary, severity, target_groups, suggested_policies }`.
  LLM must be prompted to return **only** valid JSON matching `lib/schema.ts`; parse
  defensively (strip code fences, validate with zod, retry once on failure).
- `POST /api/reports` → saves a confirmed, masked report. `GET /api/reports?filters` → list.
- `POST /api/cluster` → recompute clusters over unclustered reports.
- `POST /api/score` → compute/refresh `priority_score` + `score_breakdown`.
- `POST /api/policy-report` → `{ cluster_id }` → markdown report; persist to `policy_reports`.
- `GET /api/transit?stopId=…` (phase 08) → proxy Gyeonggi API server-side; cache a
  fallback JSON so the demo never fails if the upstream is down.

## Priority score (keep it transparent — do NOT fake precision)

```
score = 100 * (
  0.40 * recurrence        +   // how many reports in this cluster (normalized)
  0.22 * safety            +   // accident / night-return / pedestrian risk
  0.13 * time_sensitivity  +   // rush hour / school hours / late night
  0.13 * vulnerable_impact +   // elderly, disabled, students, pregnant
  0.08 * policy_alignment  +   // matches circular rail / express bus / night transit
  0.04 * feasibility           // short-term route/signal/stop tweak possible
)
```

Each factor is 0–1. The exact weights live in `lib/scoring.ts` and the breakdown is
shown in the UI. The LLM may *explain* a score in words, but the number comes from
this formula, not from the model.

## Security checklist (verify every phase)

- No secret has a `NEXT_PUBLIC_` prefix.
- `lib/llm.ts`, `lib/supabase/server.ts`, and every `app/api/*/route.ts` are
  server-only; never imported into a client component.
- Nothing in the client bundle contains a key (grep the build output if unsure).
- Stored reports contain no raw PII.
