# 30분 화성 AI 맵 (hwaseong-ai-map)

2026 화성시 시민·공무원 AI 공모전 출품작. 시민이 교통불편을 글로 남기면 AI가 구조화하고
지도에 표시해 중복 이슈를 병합, 우선순위를 매겨 정책 검토 보고서 초안을 생성합니다.

Full context: [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) · Technical spec:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Build plan: [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Local run

```bash
npm install
cp .env.example .env.local   # fill in real Supabase / LLM values
npm run dev                  # http://localhost:3000
```

Other commands:

```bash
npm run build    # production build — must pass with no type errors
npm run lint     # eslint
```

## Environment

Copy `.env.example` to `.env.local` and fill values. `.env.local` is gitignored —
never commit real keys. Variable meanings are documented in `.env.example` and
`docs/ARCHITECTURE.md`. No secret may use the `NEXT_PUBLIC_` prefix except the
Supabase URL and anon key, which are safe for the browser (protected by RLS).

## Live URL

https://30-min-hwaseong-ai-map.vercel.app/
