import "server-only";
import { fetchNearbyStations, GbisApiError } from "@/lib/gbis";
import type { SavedReport } from "@/lib/schema";

// A cluster can span many real locations (e.g. 봉담읍 reports scattered
// across the whole 읍), so we no longer map a cluster to one hardcoded
// station by title substring. Instead we look up real nearby stations for
// every distinct geocoded report location in the cluster, merge them, and
// keep the closest few overall. This also naturally covers clusters whose
// title doesn't happen to contain "버스" (e.g. 동탄역 환승 문제), since the
// lookup no longer depends on title text at all.

// Two coordinates within this distance are treated as "the same point" for
// deduping report locations before hitting the API — reports geocoded to the
// same stop/intersection shouldn't trigger duplicate lookups.
const DEDUPE_EPSILON_DEGREES = 0.0005; // ~50m

const MAX_STATIONS_PER_CLUSTER = 5;
const MAX_LOOKUPS_PER_CLUSTER = 8;

export type ClusterStation = {
  stationId: string;
  stationName: string;
  distance: number;
};

function dedupeCoordinates(
  reports: Pick<SavedReport, "lat" | "lng">[]
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  for (const r of reports) {
    if (r.lat == null || r.lng == null) continue;
    const isDuplicate = points.some(
      (p) =>
        Math.abs(p.lat - r.lat!) < DEDUPE_EPSILON_DEGREES &&
        Math.abs(p.lng - r.lng!) < DEDUPE_EPSILON_DEGREES
    );
    if (!isDuplicate) points.push({ lat: r.lat, lng: r.lng });
  }
  return points;
}

/**
 * Finds real nearby bus stations for a cluster, derived from its member
 * reports' geocoded coordinates. Returns the closest stations overall,
 * deduped by stationId, across all distinct report locations in the cluster.
 */
export async function findNearbyStationsForCluster(
  reports: Pick<SavedReport, "lat" | "lng">[]
): Promise<ClusterStation[]> {
  const points = dedupeCoordinates(reports).slice(0, MAX_LOOKUPS_PER_CLUSTER);
  if (points.length === 0) return [];

  const results = await Promise.allSettled(
    points.map((p) => fetchNearbyStations(p.lng, p.lat))
  );

  const byStationId = new Map<string, ClusterStation>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const station of result.value) {
      const id = String(station.stationId);
      const existing = byStationId.get(id);
      if (!existing || station.distance < existing.distance) {
        byStationId.set(id, {
          stationId: id,
          stationName: station.stationName,
          distance: station.distance,
        });
      }
    }
  }

  if (byStationId.size === 0) {
    const allFailed = results.every((r) => r.status === "rejected");
    if (allFailed) {
      throw new GbisApiError("Failed to look up nearby stations for cluster.");
    }
  }

  return Array.from(byStationId.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_STATIONS_PER_CLUSTER);
}
