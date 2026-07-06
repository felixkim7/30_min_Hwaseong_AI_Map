import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computePriorityScore, computeScoreBreakdown } from "@/lib/scoring";
import type { SavedReport } from "@/lib/schema";

export async function POST() {
  const { data: clusters, error: clustersError } = await supabaseServer
    .from("clusters")
    .select("id");

  if (clustersError) {
    console.error("POST /api/score: failed to fetch clusters", clustersError);
    return NextResponse.json(
      { error: "클러스터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  let scored = 0;

  for (const cluster of clusters ?? []) {
    const { data: members, error: membersError } = await supabaseServer
      .from("reports")
      .select("*")
      .eq("cluster_id", cluster.id);

    if (membersError || !members || members.length === 0) {
      if (membersError) {
        console.error(
          "POST /api/score: failed to fetch cluster members",
          membersError
        );
      }
      continue;
    }

    const breakdown = computeScoreBreakdown(members as SavedReport[]);
    const priorityScore = computePriorityScore(breakdown);

    const { error: updateError } = await supabaseServer
      .from("clusters")
      .update({
        priority_score: priorityScore,
        score_breakdown: breakdown,
        report_count: members.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cluster.id);

    if (updateError) {
      console.error(
        "POST /api/score: failed to update cluster score",
        updateError
      );
      continue;
    }

    scored += 1;
  }

  return NextResponse.json({ clusters_scored: scored });
}
