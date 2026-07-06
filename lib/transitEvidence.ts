// Maps a cluster to a specific GBIS bus stop to show as live evidence in the
// admin cluster detail (phase 08). Deliberately small — the phase notes say
// one or two well-chosen working examples beat broad-but-flaky coverage.
// Match by substring against the cluster title.
//
// Stop confirmed from supabase/seed/busstops.csv (경기도_버스정류소 현황):
// 수영오거리.방송통신대입구, 화성시 봉담읍 (stationId 233000839), which is the
// real-world location behind the "수영오거리 버스 문제" cluster. /api/transit
// fetches every route serving this stop and shows arrivals for all of them.
type TransitEvidenceConfig = {
  clusterTitleIncludes: string;
  stationId: string;
  stationName: string;
  note: string;
};

export const TRANSIT_EVIDENCE_CONFIG: TransitEvidenceConfig[] = [
  {
    clusterTitleIncludes: "버스",
    stationId: "233000839",
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
