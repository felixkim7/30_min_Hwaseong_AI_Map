import "server-only";
import { z } from "zod";
import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { supabaseServer } from "@/lib/supabase/server";
import type { SavedReport } from "@/lib/schema";

const groupingResultSchema = z.object({
  groups: z.array(
    z.object({
      report_indices: z.array(z.number().int().min(0)).min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
    })
  ),
});

const SYSTEM_PROMPT = `당신은 화성시 교통불편 제보를 분석하는 도우미입니다.
여러 건의 제보 요약을 받아 "같은 근본 문제"를 설명하는 제보끼리 그룹으로 묶으세요.
같은 정류장/도로/지역에서 같은 유형의 불편(예: 배차간격, 심야 귀가, 횡단보도 안전)을
반복적으로 이야기하면 하나의 그룹입니다. 서로 다른 문제라면 별도 그룹으로 두세요.
겹치는 제보가 전혀 없으면 각 제보를 자신만의 그룹(원소 1개)으로 두어도 됩니다.

각 그룹마다 대표 제목(title, 15자 내외 한국어)과 한 문장 요약(summary)을 작성하세요.
report_indices는 입력으로 주어진 0부터 시작하는 인덱스 번호를 그대로 사용하세요.
모든 입력 인덱스는 정확히 하나의 그룹에 속해야 합니다 (누락/중복 금지).

오직 아래 JSON 형식으로만 출력하세요. 코드 블록이나 설명 문장은 포함하지 마세요.
{
  "groups": [
    { "report_indices": number[], "title": string, "summary": string }
  ]
}`;

function buildUserPrompt(
  reports: Pick<
    SavedReport,
    "sub_category" | "location_name" | "time_pattern" | "summary"
  >[]
) {
  const lines = reports.map(
    (r, i) =>
      `${i}. [${r.sub_category}] ${r.location_name} (${r.time_pattern}) - ${r.summary}`
  );
  return `# 제보 목록\n${lines.join("\n")}\n\n위 제보들을 규칙에 따라 그룹으로 묶어 JSON을 출력하세요.`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

async function requestGrouping(reports: SavedReport[]) {
  const raw = await callLLM({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(reports),
  });
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  const result = groupingResultSchema.parse(parsed);

  const seen = new Set<number>();
  for (const group of result.groups) {
    for (const idx of group.report_indices) {
      if (idx < 0 || idx >= reports.length) {
        throw new Error(`Model returned out-of-range index ${idx}`);
      }
      seen.add(idx);
    }
  }
  if (seen.size !== reports.length) {
    throw new Error("Model did not cover every report exactly once.");
  }

  return result.groups;
}

// Asking the model to track indices across a large batch in one shot gets
// less reliable as the batch grows — it's prone to skipping or duplicating
// an index. Grouping only needs to see reports in local batches to find
// duplicates in a demo-scale dataset, so cap each LLM call's input size.
const MAX_BATCH_SIZE = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST() {
  const { data: unclustered, error: fetchError } = await supabaseServer
    .from("reports")
    .select("*")
    .is("cluster_id", null);

  if (fetchError) {
    console.error("POST /api/cluster: failed to fetch reports", fetchError);
    return NextResponse.json(
      { error: "제보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const reports = (unclustered ?? []) as SavedReport[];

  if (reports.length === 0) {
    return NextResponse.json({ clusters_created: 0, reports_clustered: 0 });
  }

  const batches = chunk(reports, MAX_BATCH_SIZE);
  let clustersCreated = 0;
  let reportsClustered = 0;
  let batchesFailed = 0;

  for (const batch of batches) {
    let groups: Awaited<ReturnType<typeof requestGrouping>>;
    try {
      groups = await requestGrouping(batch);
    } catch (firstError) {
      try {
        groups = await requestGrouping(batch);
      } catch (secondError) {
        console.error(
          "POST /api/cluster: grouping failed twice for a batch",
          firstError,
          secondError
        );
        batchesFailed += 1;
        continue;
      }
    }

    for (const group of groups) {
      const members = group.report_indices.map((idx) => batch[idx]);
      const districts = members
        .map((m) => m.district)
        .filter((d): d is string => Boolean(d));
      const district = districts[0] ?? null;

      const { data: cluster, error: clusterError } = await supabaseServer
        .from("clusters")
        .insert({
          title: group.title,
          summary: group.summary,
          district,
          report_count: members.length,
          representative_report_id: members[0].id,
        })
        .select()
        .single();

      if (clusterError || !cluster) {
        console.error(
          "POST /api/cluster: failed to create cluster",
          clusterError
        );
        continue;
      }

      const { error: updateError } = await supabaseServer
        .from("reports")
        .update({ cluster_id: cluster.id, status: "clustered" })
        .in(
          "id",
          members.map((m) => m.id)
        );

      if (updateError) {
        console.error(
          "POST /api/cluster: failed to assign cluster_id",
          updateError
        );
        continue;
      }

      clustersCreated += 1;
      reportsClustered += members.length;
    }
  }

  if (clustersCreated === 0 && batchesFailed > 0) {
    return NextResponse.json(
      { error: "AI 클러스터링에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    clusters_created: clustersCreated,
    reports_clustered: reportsClustered,
    batches_failed: batchesFailed,
  });
}
