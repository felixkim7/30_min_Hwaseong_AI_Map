# Project Brief — 30-Minute Hwaseong AI Map (30분 화성 AI 맵)

## The contest

- **2026 Hwaseong City Citizen & Public-Official AI Contest** — Part 1 of the city's
  "AI 화성 챌린지" event. This is the mayor's own flagship AI showcase, so aligning
  with current city policy is a scoring advantage, not just flavor.
- **Submission format:** a web URL (website / web app / dashboard) that a judge can
  open in a normal PC browser (Chrome / Edge, latest) with no install and demo
  immediately. Plain planning docs or non-working mockups are rejected.
- **Scoring bonus:** entries that implement an actually-working service with real
  AI / API / public-data integration score higher on technical completeness. A
  prototype is allowed, but "real and running" beats "impressive on paper".
- **Final round:** 5-min slide presentation + 2-min live demo + 3-min Q&A.
- Assume the **citizen division** unless told otherwise. If we switch to the
  public-official division, lead with the admin dashboard + auto report instead of
  the citizen input flow (same codebase, different emphasis).

## The problem

Hwaseong is a 1-million+ "special city" spread across very different living zones —
Dongtan new town, plus Byeongjeom, Bongdam, Hyangnam, Namyang, Bibong and rural
areas. Traffic pain differs sharply by zone (bus headways, transfers, late-night
gaps, road congestion, pedestrian safety). Today those complaints are scattered
across petitions, boards and communities, so the city cannot easily see *which*
problem recurs *where*, or which fix would help the most citizens first.

## The solution (one line)

Citizens report traffic inconvenience in plain language; AI turns each report into
structured city data, maps it, merges duplicates into ranked policy issues, and
drafts a review report an administrator can act on.

## Why it fits current Hwaseong policy

- The mayor named traffic the #1 citizen concern; core pledges include the 30-minute
  living zone, expanded express/airport buses, late-night safe-return transport, and
  a circular railway. The product name and features map straight onto that agenda.
- It also advances the "citizen co-governance" (시민협치 / 화성동행기구) and
  "city-data-driven administration" directions.

## Differentiation — IMPORTANT

The city already runs an "AI 민원실" (predictive, general-purpose complaint system
built on a city-data ontology, including profanity filtering). Our engine
(unstructured citizen text → structured data → policy) overlaps with it
conceptually, so we MUST make the difference explicit in the write-up and the demo:

1. **Traffic-specialized**, not general complaints.
2. **Citizen-participatory**: people see the map and contribute to it (co-governance),
   vs. a back-office system.
3. **Prioritization**: we compress duplicates into a ranked policy queue, not just
   log tickets.

If a judge who knows the city's projects sees only "we structure complaints with
AI", we lose creativity points. Lead with the three points above.

## How features map to the 5 judging criteria (20 pts each)

| Criterion | Where we win |
|---|---|
| Creativity (창의성) | Citizen text → ranked policy data + auto report; the three differentiators above |
| Efficiency (효율성) | Auto classification, duplicate merging, and report drafting cut manual triage time |
| Application scope (적용범위) | Covers buses, rail transfers, late-night gaps, pedestrian safety, congestion. Frame traffic as a **pilot** of a method that extends to welfare / safety / environment — this lifts both this score and continuity |
| Continuity (계속성) | Value compounds as reports accumulate; quarterly policy reports; participatory data pipeline |
| Technical completeness (기술성) | Live LLM structuring + map + clustering + scoring + auto report + (phase 08) real public-data evidence, all demoable in-browser |

## Known weaknesses & prepared answers

- **Cold start (no real reports yet):** frame as a "participatory data-collection
  platform" and pre-seed 40–50 realistic sample reports (phase 09).
- **"How do you know the AI's policy suggestion is correct?":** the service does not
  decide policy. It structures citizen input and surfaces recurring issues as
  *candidate* reviews for staff, who decide using demand, budget, operator
  negotiation, and legal process. Keep this line ready for Q&A.
- **"Are the priority scores arbitrary?":** the formula is transparent and shown to
  the user (weights are visible), and at least one issue is backed by real public
  data in phase 08. Do not fake precision — show the breakdown honestly.

## Out of scope (do not build)

- Real-time route planning / navigation.
- User accounts and login for citizens (reporting is anonymous; admin view can be a
  simple gated route). Keep auth minimal.
- Native mobile apps. Web only, mobile-friendly responsive layout is enough.
