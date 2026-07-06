import "server-only";
import { z } from "zod";

// 경기버스정보(GBIS) bus arrival API — confirmed working endpoint/params via
// live testing (2026-07). Docs: https://www.gbis.go.kr/gbis2014/publicService.action?cmd=mBusArrival
const BASE_URL = "https://apis.data.go.kr/6410000/busarrivalservice/v2";

// GBIS uses "" (empty string) as a sentinel for "no second bus tracked" on
// slot-2 fields (and occasionally slot-1 when nothing is currently running),
// instead of omitting the field or using null/0. Normalize "" -> null before
// validating the real type.
const nullableNumber = z.preprocess(
  (v) => (v === "" ? null : v),
  z.number().nullable().optional()
);
const nullableString = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().nullable().optional()
);

const gbisArrivalItemSchema = z.object({
  stationId: z.number(),
  routeId: z.number(),
  routeName: z.union([z.string(), z.number()]).transform(String),
  staOrder: z.number(),
  flag: z.string(), // "RUN" | "PASS" | "STOP" | "WAIT" | ...
  predictTime1: nullableNumber,
  predictTimeSec1: nullableNumber,
  predictTime2: nullableNumber,
  predictTimeSec2: nullableNumber,
  remainSeatCnt1: nullableNumber,
  remainSeatCnt2: nullableNumber,
  crowded1: nullableNumber,
  crowded2: nullableNumber,
  stationNm1: nullableString,
  stationNm2: nullableString,
});

const gbisResponseSchema = z.object({
  response: z.object({
    msgHeader: z.object({
      resultCode: z.number(),
      resultMessage: z.string(),
    }),
    msgBody: z
      .object({
        busArrivalItem: gbisArrivalItemSchema.optional(),
      })
      .optional(),
  }),
});

export type GbisArrivalItem = z.infer<typeof gbisArrivalItemSchema>;

export class GbisApiError extends Error {}

/**
 * Fetches live arrival info for one bus route at one stop. Server-only —
 * the API key must never reach the browser.
 */
export async function fetchBusArrival(params: {
  stationId: string;
  routeId: string;
  staOrder: string;
}): Promise<GbisArrivalItem> {
  const apiKey = process.env.GYEONGGI_DATA_API_KEY;
  if (!apiKey) {
    throw new GbisApiError("GYEONGGI_DATA_API_KEY is not set.");
  }

  const url = new URL(`${BASE_URL}/getBusArrivalItemv2`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("stationId", params.stationId);
  url.searchParams.set("routeId", params.routeId);
  url.searchParams.set("staOrder", params.staOrder);
  url.searchParams.set("format", "json");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new GbisApiError(`GBIS API returned HTTP ${res.status}`);
  }

  const raw = await res.json();
  const parsed = gbisResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GbisApiError("GBIS API returned an unexpected shape.");
  }

  const { resultCode, resultMessage } = parsed.data.response.msgHeader;
  if (resultCode !== 0) {
    throw new GbisApiError(`GBIS API error ${resultCode}: ${resultMessage}`);
  }

  const item = parsed.data.response.msgBody?.busArrivalItem;
  if (!item) {
    throw new GbisApiError("GBIS API returned no arrival data.");
  }

  return item;
}
