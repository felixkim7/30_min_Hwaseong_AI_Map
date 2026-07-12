// Maps a cluster to a specific GBIS bus stop to show as live evidence in the
// admin cluster detail (phase 08). Deliberately small — the phase notes say
// one or two well-chosen working examples beat broad-but-flaky coverage.
// Match by substring against the cluster title.
//
// Stop verified by resolving the actual route mentioned in the report
// (7790번 버스) via getBusRouteListv2 (routeId 200000149) and then checking
// its real stop list via getBusRouteStationListv2 — route 7790 genuinely
// stops at stationId 233000593 "수영오거리.방송통신대입구" (화성시 side,
// stationSeq 50). This supersedes an earlier, wrong pick (stationId
// 233000839) that only matched on stop *name* similarity without ever
// confirming route 7790 actually served it — it didn't. Don't repeat that
// mistake: always verify via the route's own stop list, not name-matching
// alone, and don't trust unrelated third-party sources over the route data.
type TransitEvidenceConfig = {
  clusterTitleIncludes: string;
  stationId: string;
  stationName: string;
  note: string;
};

export const TRANSIT_EVIDENCE_CONFIG: TransitEvidenceConfig[] = [
  {
    clusterTitleIncludes: "버스",
    stationId: "233000593",
    stationName: "수영오거리.방송통신대입구 (화성시 봉담읍)",
    note: "※ 이 정류소를 지나는 모든 노선의 실시간 도착정보입니다. 노선 카드에 표시되는 위치는 정류소명이 아니라 현재 버스가 지나고 있는 위치입니다.",
  },
];

export function findTransitEvidenceConfig(
  clusterTitle: string
): TransitEvidenceConfig | null {
  return (
    TRANSIT_EVIDENCE_CONFIG.find((c) =>
      clusterTitle.includes(c.clusterTitleIncludes)
    ) ?? null
  );
}
