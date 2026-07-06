import type { GbisArrivalItem } from "@/lib/gbis";

// Demo safety net (see docs/phases/phase-08-public-data-integration.md): if the
// live GBIS API is down or rate-limited, /api/transit serves this cached
// snapshot instead of failing outright. The UI must always label this
// clearly as cached, never pass it off as live.
//
// Captured live from 수영오거리.방송통신대입구 (화성시 봉담읍), route H103.
export const TRANSIT_FALLBACK_SNAPSHOT: {
  capturedAt: string;
  item: GbisArrivalItem;
} = {
  capturedAt: "2026-07-06T20:58:25+09:00",
  item: {
    stationId: 233000839,
    routeId: 233000331,
    routeName: "H103",
    staOrder: 62,
    flag: "PASS",
    predictTime1: 6,
    predictTimeSec1: 353,
    predictTime2: null,
    predictTimeSec2: null,
    remainSeatCnt1: 0,
    remainSeatCnt2: 0,
    crowded1: 1,
    crowded2: 0,
    stationNm1: "서수원주민편익시설",
    stationNm2: null,
  },
};
