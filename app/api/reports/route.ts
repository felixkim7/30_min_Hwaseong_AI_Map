import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createReportSchema, savedReportSchema } from "@/lib/schema";
import { geocodeLocation, GeocodeError } from "@/lib/kakaoGeocode";

const FILTERABLE_COLUMNS = [
  "district",
  "transport_mode",
  "time_pattern",
  "sub_category",
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  let query = supabaseServer
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  for (const column of FILTERABLE_COLUMNS) {
    const value = searchParams.get(column);
    if (value) {
      query = query.eq(column, value);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET /api/reports failed", error);
    return NextResponse.json(
      { error: "제보 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const reports = savedReportSchema.array().parse(data);
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  let geocoded: { lat: number; lng: number; district: string } | null = null;
  try {
    const result = await geocodeLocation(parsed.data.location_name);
    if (result) {
      geocoded = { lat: result.lat, lng: result.lng, district: result.district };
    }
  } catch (err) {
    // Geocoding is best-effort — never block saving a report over it.
    if (err instanceof GeocodeError) {
      console.error("POST /api/reports: geocoding failed", err);
    } else {
      throw err;
    }
  }

  const { data, error } = await supabaseServer
    .from("reports")
    .insert({
      ...parsed.data,
      lat: geocoded?.lat ?? null,
      lng: geocoded?.lng ?? null,
      district: geocoded?.district ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("POST /api/reports failed", error);
    return NextResponse.json(
      { error: "제보 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  const report = savedReportSchema.parse(data);
  return NextResponse.json({ report }, { status: 201 });
}
