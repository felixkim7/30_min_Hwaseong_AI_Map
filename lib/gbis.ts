import "server-only";
import { z } from "zod";

// 경기버스정보(GBIS) APIs — confirmed working endpoints/params via live
// testing (2026-07). Docs: https://www.gbis.go.kr/gbis2014/publicService.action
const ARRIVAL_BASE_URL = "https://apis.data.go.kr/6410000/busarrivalservice/v2";
const STATION_BASE_URL = "https://apis.data.go.kr/6410000/busstationservice/v2";

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

const gbisRouteAtStationSchema = z.object({
  routeId: z.number(),
  routeName: z.union([z.string(), z.number()]).transform(String),
  routeTypeName: z.string().nullable().optional(),
  routeDestName: z.string().nullable().optional(),
  staOrder: z.number(),
  regionName: z.string().nullable().optional(),
});

const gbisStationRouteResponseSchema = z.object({
  response: z.object({
    msgHeader: z.object({
      resultCode: z.number(),
      resultMessage: z.string(),
    }),
    msgBody: z
      .object({
        busRouteList: z
          .union([z.array(gbisRouteAtStationSchema), gbisRouteAtStationSchema])
          .optional(),
      })
      .optional(),
  }),
});

export type GbisRouteAtStation = z.infer<typeof gbisRouteAtStationSchema>;

const gbisNearbyStationSchema = z.object({
  stationId: z.number(),
  stationName: z.string(),
  x: z.number(),
  y: z.number(),
  distance: z.number(),
});

const gbisNearbyStationResponseSchema = z.object({
  response: z.object({
    msgHeader: z.object({
      resultCode: z.number(),
      resultMessage: z.string(),
    }),
    msgBody: z
      .object({
        busStationAroundList: z
          .union([z.array(gbisNearbyStationSchema), gbisNearbyStationSchema])
          .optional(),
      })
      .optional(),
  }),
});

export type GbisNearbyStation = z.infer<typeof gbisNearbyStationSchema>;

export class GbisApiError extends Error {}

function getApiKey(): string {
  const apiKey = process.env.GYEONGGI_DATA_API_KEY;
  if (!apiKey) {
    throw new GbisApiError("GYEONGGI_DATA_API_KEY is not set.");
  }
  return apiKey;
}

/**
 * Fetches live arrival info for one bus route at one stop. Server-only —
 * the API key must never reach the browser.
 */
export async function fetchBusArrival(params: {
  stationId: string;
  routeId: string;
  staOrder: string;
}): Promise<GbisArrivalItem> {
  const url = new URL(`${ARRIVAL_BASE_URL}/getBusArrivalItemv2`);
  url.searchParams.set("serviceKey", getApiKey());
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

/**
 * Fetches every bus route that stops at a given station. Server-only.
 */
export async function fetchRoutesAtStation(
  stationId: string
): Promise<GbisRouteAtStation[]> {
  const url = new URL(`${STATION_BASE_URL}/getBusStationViaRouteListv2`);
  url.searchParams.set("serviceKey", getApiKey());
  url.searchParams.set("stationId", stationId);
  url.searchParams.set("format", "json");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new GbisApiError(`GBIS API returned HTTP ${res.status}`);
  }

  const raw = await res.json();
  const parsed = gbisStationRouteResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GbisApiError("GBIS API returned an unexpected shape.");
  }

  const { resultCode, resultMessage } = parsed.data.response.msgHeader;
  if (resultCode !== 0) {
    throw new GbisApiError(`GBIS API error ${resultCode}: ${resultMessage}`);
  }

  const list = parsed.data.response.msgBody?.busRouteList;
  if (!list) return [];
  return Array.isArray(list) ? list : [list];
}

// GBIS uses resultCode 4 ("결과가 존재하지 않습니다") to mean "no stations
// near this point" — a valid empty result, not an API failure.
const NO_RESULTS_CODE = 4;

/**
 * Fetches bus stops near a coordinate (WGS84), sorted by distance. Server-only.
 * Used to discover real stations for a report's geocoded location instead of
 * relying on any hardcoded station config.
 */
export async function fetchNearbyStations(
  x: number,
  y: number
): Promise<GbisNearbyStation[]> {
  const url = new URL(`${STATION_BASE_URL}/getBusStationAroundListv2`);
  url.searchParams.set("serviceKey", getApiKey());
  url.searchParams.set("x", String(x));
  url.searchParams.set("y", String(y));
  url.searchParams.set("format", "json");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new GbisApiError(`GBIS API returned HTTP ${res.status}`);
  }

  const raw = await res.json();
  const parsed = gbisNearbyStationResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GbisApiError("GBIS API returned an unexpected shape.");
  }

  const { resultCode, resultMessage } = parsed.data.response.msgHeader;
  if (resultCode === NO_RESULTS_CODE) return [];
  if (resultCode !== 0) {
    throw new GbisApiError(`GBIS API error ${resultCode}: ${resultMessage}`);
  }

  const list = parsed.data.response.msgBody?.busStationAroundList;
  if (!list) return [];
  return Array.isArray(list) ? list : [list];
}
