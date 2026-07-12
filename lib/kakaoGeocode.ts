import "server-only";
import { z } from "zod";

// Kakao Local API — keyword search, used to resolve a citizen's free-text
// location into real coordinates. Docs: https://developers.kakao.com/docs/latest/ko/local/dev-guide
const BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

const kakaoDocumentSchema = z.object({
  place_name: z.string(),
  address_name: z.string(),
  road_address_name: z.string().optional(),
  x: z.string(), // longitude
  y: z.string(), // latitude
});

const kakaoResponseSchema = z.object({
  documents: z.array(kakaoDocumentSchema),
  meta: z.object({
    total_count: z.number(),
  }),
});

export type GeocodeResult = {
  lat: number;
  lng: number;
  district: string;
  matchedName: string;
};

export class GeocodeError extends Error {}

// district is derived from the matched address's 시/군/구 + 읍/면/동 segment
// (e.g. "경기 화성시 봉담읍 수영리 672" -> "봉담읍").
function extractDistrict(addressName: string): string {
  const parts = addressName.split(" ");
  const dongEupMyeon = parts.find(
    (p) => p.endsWith("읍") || p.endsWith("면") || p.endsWith("동")
  );
  return dongEupMyeon ?? "화성시";
}

// Generic connector/suffix words that describe *where relative to a
// landmark*, not the landmark itself. Kakao's keyword search matches real
// place names well but fails on compound phrases like "OO 앞 OO 버스정류장" —
// stripping these lets us retry with just the landmark noun(s).
//
// Also includes generic transit/facility descriptors (환승센터, 환승주차장,
// 터미널 등): these are common nationwide terms, so trying one alone as a
// fallback candidate reliably matches an unrelated same-named facility in
// another city (e.g. "환승주차장" alone matched a Paju park-and-ride).
// Stripping them leaves the actual proper-noun landmark (e.g. "동탄역") as
// the candidate instead.
const NOISE_WORDS = [
  "버스정류장",
  "정류장",
  "정류소",
  "환승센터",
  "환승주차장",
  "환승터미널",
  "터미널",
  "주택가",
  "대로",
  "골목길",
  "골목",
  "앞",
  "근처",
  "인근",
  "옆",
  "건너편",
  "입구",
  "사거리",
  "삼거리",
  "일대",
];

function stripNoiseWords(text: string): string {
  let result = text;
  for (const word of NOISE_WORDS) {
    result = result.replaceAll(word, " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

// Builds a sequence of queries to try, from most specific to most permissive:
// 1. the noise-stripped text, if stripping actually removed something —
//    noise words (generic facility/road/connector terms like "대로",
//    "환승주차장") often coincidentally name-match an unrelated real place
//    (e.g. a restaurant literally called "대로식당"), so a query still
//    containing them is *less* trustworthy than one without, not more.
// 2. the full original text unchanged, if nothing was stripped (a clean
//    address with no noise words — try it as-is first)
// 3. adjacent word pairs from the stripped text, in original order (e.g.
//    "봉담 신창비바패밀리 수영초등학교" -> "봉담 신창비바패밀리", "신창비바패밀리
//    수영초등학교") — Kakao handles two real landmark nouns together well,
//    which keeps enough context to disambiguate same-named places elsewhere
// 4. each remaining individual word, longest first (last resort — a single
//    isolated word can match a same-named place in a different city)
function buildQueryCandidates(locationName: string): string[] {
  const candidates = new Set<string>();
  const trimmed = locationName.trim();
  const stripped = stripNoiseWords(trimmed);

  if (stripped && stripped !== trimmed) {
    candidates.add(stripped);
    if (trimmed) candidates.add(trimmed);
  } else {
    if (trimmed) candidates.add(trimmed);
    if (stripped) candidates.add(stripped);
  }

  const words = stripped.split(" ").filter((w) => w.length >= 2);

  const pairs = [];
  for (let i = 0; i < words.length - 1; i++) {
    pairs.push(`${words[i]} ${words[i + 1]}`);
  }
  for (const pair of pairs) {
    candidates.add(pair);
  }

  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  for (const word of sortedWords) {
    candidates.add(word);
  }

  return Array.from(candidates);
}

async function searchKeyword(
  apiKey: string,
  query: string
): Promise<z.infer<typeof kakaoResponseSchema>["documents"]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("query", query);

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new GeocodeError(`Kakao API returned HTTP ${res.status}`);
  }

  const raw = await res.json();
  const parsed = kakaoResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GeocodeError("Kakao API returned an unexpected shape.");
  }

  return parsed.data.documents;
}

/**
 * Resolves a free-text location (e.g. "봉담 신창비바패밀리 앞 수영초등학교
 * 버스정류장") to real coordinates via Kakao's keyword search. Kakao matches
 * real place names well but returns zero results for compound descriptive
 * phrases, so this tries the full text first, then progressively strips
 * connector words and retries with shorter candidate queries. Always prefers
 * a Hwaseong-address result, since building/complex names are often reused
 * across cities. Server-only — the API key must never reach the browser.
 */
export async function geocodeLocation(
  locationName: string
): Promise<GeocodeResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new GeocodeError("KAKAO_REST_API_KEY is not set.");
  }

  const candidates = buildQueryCandidates(locationName);

  // Require a genuine Hwaseong-address match at every candidate tier. A
  // generic word (e.g. "대로", "주택가") coincidentally matching *something*
  // in Hwaseong by luck is still meaningless, but accepting any non-Hwaseong
  // top hit as a fallback is worse — it has previously returned real,
  // confident-looking but wrong coordinates in Ansan/Suwon/Paju. Prefer
  // returning no match (caller falls back to null/city-center) over a
  // silently wrong pin.
  for (const candidate of candidates) {
    const query = candidate.includes("화성") ? candidate : `화성시 ${candidate}`;
    const documents = await searchKeyword(apiKey, query);

    const hwaseongMatch = documents.find((d) =>
      d.address_name.includes("화성시")
    );
    if (!hwaseongMatch) continue;

    return {
      lat: Number(hwaseongMatch.y),
      lng: Number(hwaseongMatch.x),
      district: extractDistrict(hwaseongMatch.address_name),
      matchedName: hwaseongMatch.place_name,
    };
  }

  return null;
}
