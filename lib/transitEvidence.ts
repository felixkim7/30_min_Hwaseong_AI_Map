// Maps a cluster to a specific GBIS bus stop + route to show as live evidence
// in the admin cluster detail (phase 08). Deliberately small — the phase
// notes say one or two well-chosen working examples beat broad-but-flaky
// coverage. Match by substring against the cluster title.
//
// TODO: once a Hwaseong-area stop is confirmed (station-search API pending
// approval), replace this test entry with a stop that's actually near one of
// our real clusters (e.g. 동탄역 연계버스).
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
    stationId: "200000186",
    routeId: "200000078",
    staOrder: "55",
    note: "※ 화성시 인근 정류소 확정 전까지 표시되는 예시 정류소 데이터입니다.",
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
