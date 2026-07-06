// Maps a cluster to a specific GBIS bus stop + route to show as live evidence
// in the admin cluster detail (phase 08). Deliberately small — the phase
// notes say one or two well-chosen working examples beat broad-but-flaky
// coverage. Match by substring against the cluster title.
//
// Stop confirmed from supabase/seed/busstops.csv (경기도_버스정류소 현황):
// 수영오거리.방송통신대입구, 화성시 봉담읍 (stationId 233000839), which is the
// real-world location behind the "수영오거리 버스 문제" cluster. Route H103
// (화성 ↔ 향남시외터미널) confirmed serving this stop via
// getBusStationViaRouteListv2 and returning live arrival data.
type TransitEvidenceConfig = {
  clusterTitleIncludes: string;
  stationId: string;
  routeId: string;
  staOrder: string;
  note: string;
};

export const TRANSIT_EVIDENCE_CONFIG: TransitEvidenceConfig[] = [
  {
    clusterTitleIncludes: "버스",
    stationId: "233000839",
    routeId: "233000331",
    staOrder: "62",
    note: "※ 수영오거리.방송통신대입구 정류소(화성시 봉담읍), H103 노선 실시간 도착정보입니다.",
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
