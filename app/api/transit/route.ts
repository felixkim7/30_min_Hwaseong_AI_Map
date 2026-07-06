import "server-only";
import { NextResponse } from "next/server";
import { fetchBusArrival, GbisApiError, type GbisArrivalItem } from "@/lib/gbis";
import { TRANSIT_FALLBACK_SNAPSHOT } from "@/lib/transitFallback";

// Simple in-memory TTL cache — good enough for a single-instance demo
// deployment. Avoids hammering the upstream GBIS API on every page view.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { item: GbisArrivalItem; cachedAt: number }>();

export type TransitResponse = {
  source: "live" | "cached_fallback";
  fetched_at: string;
  item: GbisArrivalItem;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");
  const routeId = searchParams.get("routeId");
  const staOrder = searchParams.get("staOrder") ?? "1";

  if (!stationId || !routeId) {
    return NextResponse.json(
      { error: "stationId와 routeId가 필요합니다." },
      { status: 400 }
    );
  }

  const cacheKey = `${stationId}:${routeId}:${staOrder}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    const body: TransitResponse = {
      source: "live",
      fetched_at: new Date(cached.cachedAt).toISOString(),
      item: cached.item,
    };
    return NextResponse.json(body);
  }

  try {
    const item = await fetchBusArrival({ stationId, routeId, staOrder });
    cache.set(cacheKey, { item, cachedAt: Date.now() });
    const body: TransitResponse = {
      source: "live",
      fetched_at: new Date().toISOString(),
      item,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof GbisApiError) {
      console.error("GET /api/transit: GBIS API failed, serving fallback", error);
      const body: TransitResponse = {
        source: "cached_fallback",
        fetched_at: TRANSIT_FALLBACK_SNAPSHOT.capturedAt,
        item: TRANSIT_FALLBACK_SNAPSHOT.item,
      };
      return NextResponse.json(body);
    }
    throw error;
  }
}
