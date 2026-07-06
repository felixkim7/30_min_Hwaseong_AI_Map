import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createReportSchema, savedReportSchema } from "@/lib/schema";

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

  const { data, error } = await supabaseServer
    .from("reports")
    .insert(parsed.data)
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
