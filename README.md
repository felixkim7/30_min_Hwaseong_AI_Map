# 30분 화성 AI 맵 (hwaseong-ai-map)

2026 화성시 시민·공무원 AI 공모전 출품작. 시민이 교통불편을 글로 남기면 AI가 개인정보를
마스킹하고 구조화된 데이터로 바꿔 지도에 표시합니다. 같은 문제를 겪는 제보끼리 실측 위치
기반으로 자동 병합하고, 투명한 기준으로 우선순위를 매긴 뒤, 실측 대중교통 데이터를 근거로
한 정책 검토 보고서를 한 번의 클릭으로 생성합니다.

Full context: [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) · Technical spec:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Build plan: [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Live URL

https://30-min-hwaseong-ai-map.vercel.app/

## 데모 시나리오 (2분)

1. **시민 제보** — [`/report`](https://30-min-hwaseong-ai-map.vercel.app/report)에서
   평범한 말투로 교통 불편을 작성합니다.
   예: "동탄역에서 환승할 때 버스가 너무 안 와서 GTX 놓칠 뻔했습니다."
2. **AI 구조화 및 마스킹** — AI가 실명·전화번호 등 개인정보를 실제로 등장한 경우에만 자동
   마스킹하고, 불편 유형·위치·시간대·심각도로 구조화한 결과를 검토 화면에서 보여줍니다.
   시민이 확인 후 제출하면 저장됩니다.
3. **지도에 표시** — [`/map`](https://30-min-hwaseong-ai-map.vercel.app/map)에서 실측
   좌표로 지도에 핀이 표시됩니다. (신규 제보는 다음 클러스터링 실행 시 기존 클러스터에
   합류하거나 새 클러스터가 됩니다 — 실시간 자동 합류는 아닙니다.)
4. **관리자 대시보드** — [`/admin`](https://30-min-hwaseong-ai-map.vercel.app/admin)에서
   우선순위 점수로 정렬된 클러스터 목록을 확인합니다. 예: "봉담읍 버스 배차 문제" 클러스터를
   열면 협성대학교 정문·봉담호수공원·봉담읍행정복지센터 등 실제 좌표 기반으로 묶인 제보들과
   지도, 점수 세부 내역을 볼 수 있습니다.
5. **정책 검토 보고서 생성** — 클러스터 상세 화면에서 "정책 검토 보고서 생성" 버튼을
   클릭하면, 현황·반복 제보 요약·문제 원인 추정·단기/중장기 개선안·관련 시정 방향·기대효과로
   구성된 보고서가 생성됩니다. 대중교통 관련 클러스터 중 실측 노선 데이터상 연결이 끊긴
   지점이 있는 경우 "대중교통 개선 제안" 섹션이 추가로 생성되며, 실제 정류소명과 노선 번호를
   인용해 근거를 제시합니다 (배차 간격 등 구체적 운영 수치는 지어내지 않도록 설계됨).

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
node supabase/seed/seed.mjs   # reset DB to ~240 seeded demo reports (wipes existing data)
```

## Environment

Copy `.env.example` to `.env.local` and fill values. `.env.local` is gitignored —
never commit real keys. Variable meanings are documented in `.env.example` and
`docs/ARCHITECTURE.md`. No secret may use the `NEXT_PUBLIC_` prefix except the
Supabase URL and anon key, which are safe for the browser (protected by RLS).
