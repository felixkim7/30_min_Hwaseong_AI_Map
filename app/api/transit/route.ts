import "server-only";
import { NextResponse } from "next/server";
import {
  fetchBusArrival,
  fetchRoutesAtStation,
  GbisApiError,
  type GbisArrivalItem,
} from "@/lib/gbis";
import { TRANSIT_FALLBACK_SNAPSHOT } from "@/lib/transitFallback";

// Simple in-memory TTL cache — good enough for a single-instance demo
// deployment. Avoids hammering the upstream GBIS API on every page view.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { items: GbisArrivalItem[]; cachedAt: number }>();

export type TransitResponse = {
  source: "live" | "cached_fallback";
  fetched_at: string;
  items: GbisArrivalItem[];
};

async function fetchAllArrivalsForStation(
  stationId: string
): Promise<GbisArrivalItem[]> {
  let routes;
  try {
    routes = await fetchRoutesAtStation(stationId);
  } catch {
    // The route list is a single request the whole response depends on —
    // worth one retry before giving up and falling back, since a transient
    // upstream hiccup here would otherwise blank out all 13+ routes.
    routes = await fetchRoutesAtStation(stationId);
  }
  if (routes.length === 0) {
    throw new GbisApiError("No routes found for this station.");
  }

  const results = await Promise.allSettled(
    routes.map((route) =>
      fetchBusArrival({
        stationId,
        routeId: String(route.routeId),
        staOrder: String(route.staOrder),
      })
    )
  );

  const items = results
    .filter(
      (r): r is PromiseFulfilledResult<GbisArrivalItem> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (items.length === 0) {
    throw new GbisApiError("No arrival data available for any route.");
  }

  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return NextResponse.json(
      { error: "stationId가 필요합니다." },
      { status: 400 }
    );
  }

  const cached = cache.get(stationId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    const body: TransitResponse = {
      source: "live",
      fetched_at: new Date(cached.cachedAt).toISOString(),
      items: cached.items,
    };
    return NextResponse.json(body);
  }

  try {
    const items = await fetchAllArrivalsForStation(stationId);
    cache.set(stationId, { items, cachedAt: Date.now() });
    const body: TransitResponse = {
      source: "live",
      fetched_at: new Date().toISOString(),
      items,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof GbisApiError) {
      console.error("GET /api/transit: GBIS API failed, serving fallback", error);
      const body: TransitResponse = {
        source: "cached_fallback",
        fetched_at: TRANSIT_FALLBACK_SNAPSHOT.capturedAt,
        items: TRANSIT_FALLBACK_SNAPSHOT.items,
      };
      return NextResponse.json(body);
    }
    throw error;
  }
}
