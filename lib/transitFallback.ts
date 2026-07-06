import type { GbisArrivalItem } from "@/lib/gbis";

// Demo safety net (see docs/phases/phase-08-public-data-integration.md): if the
// live GBIS API is down or rate-limited, /api/transit serves this cached
// snapshot instead of failing outright. The UI must always label this
// clearly as cached, never pass it off as live.
//
// TODO: replace stationId/routeId with a confirmed Hwaseong-area stop once
// the GBIS station-search API application is approved and we've looked up a
// real stop near a reported cluster (e.g. 동탄역 연계버스).
export const TRANSIT_FALLBACK_SNAPSHOT: {
  capturedAt: string;
  item: GbisArrivalItem;
} = {
  capturedAt: "2026-07-06T20:17:16+09:00",
  item: {
    stationId: 200000186,
    routeId: 200000078,
    routeName: "62-1",
    staOrder: 55,
    flag: "PASS",
    predictTime1: 6,
    predictTimeSec1: 456,
    predictTime2: 22,
    predictTimeSec2: 1336,
    remainSeatCnt1: 0,
    remainSeatCnt2: 0,
    crowded1: 1,
    crowded2: 1,
    stationNm1: "팔달구청.화성행궁.수원성지",
    stationNm2: "매탄2동주민센터",
  },
};
