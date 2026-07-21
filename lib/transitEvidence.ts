import "server-only";
import { fetchNearbyStations, fetchRoutesAtStation, GbisApiError } from "@/lib/gbis";
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

// A location further than this from any real station has no meaningful
// "closest stop" to reason about — treat it as unserved rather than
// attaching a station that's really nowhere near it.
const MAX_RELEVANT_STATION_DISTANCE_METERS = 500;

export type LocationCoverage = {
  lat: number;
  lng: number;
  stationName: string | null;
  routeNames: string[];
};

export type ClusterTransitGap = {
  locations: LocationCoverage[];
  // Route names shared by two or more of the cluster's locations — i.e. the
  // cluster is already connected by at least this route.
  sharedRoutes: string[];
  // Locations with no route in common with any other location in the
  // cluster (or no nearby station at all) — the real coverage gap.
  isolatedLocations: LocationCoverage[];
};

/**
 * For each distinct report location in a cluster, finds the nearest real bus
 * stop and the routes that actually serve it, then determines which
 * locations already share a route (connected) and which don't (the real
 * coverage gap). This is deliberately computed in code, not asked of the
 * LLM — the model should reason about a gap we've already established from
 * real data, not guess at route coverage from report text alone.
 */
export async function computeClusterTransitGap(
  reports: Pick<SavedReport, "lat" | "lng">[]
): Promise<ClusterTransitGap> {
  const points = dedupeCoordinates(reports).slice(0, MAX_LOOKUPS_PER_CLUSTER);

  const locations: LocationCoverage[] = await Promise.all(
    points.map(async (point) => {
      let nearby: Awaited<ReturnType<typeof fetchNearbyStations>>;
      try {
        nearby = await fetchNearbyStations(point.lng, point.lat);
      } catch (error) {
        if (!(error instanceof GbisApiError)) throw error;
        nearby = [];
      }

      const closest = nearby[0];
      if (!closest || closest.distance > MAX_RELEVANT_STATION_DISTANCE_METERS) {
        return { ...point, stationName: null, routeNames: [] };
      }

      let routes: Awaited<ReturnType<typeof fetchRoutesAtStation>>;
      try {
        routes = await fetchRoutesAtStation(String(closest.stationId));
      } catch (error) {
        if (!(error instanceof GbisApiError)) throw error;
        routes = [];
      }

      return {
        ...point,
        stationName: closest.stationName,
        routeNames: routes.map((r) => r.routeName),
      };
    })
  );

  const routeCounts = new Map<string, number>();
  for (const location of locations) {
    for (const routeName of new Set(location.routeNames)) {
      routeCounts.set(routeName, (routeCounts.get(routeName) ?? 0) + 1);
    }
  }
  const sharedRoutes = Array.from(routeCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([routeName]) => routeName);

  const sharedRouteSet = new Set(sharedRoutes);
  const isolatedLocations = locations.filter(
    (location) =>
      location.routeNames.length === 0 ||
      !location.routeNames.some((routeName) => sharedRouteSet.has(routeName))
  );

  return { locations, sharedRoutes, isolatedLocations };
}
