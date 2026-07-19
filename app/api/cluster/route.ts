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

# 절대 규칙 — 지역(district)이 다른 제보는 반드시 다른 그룹입니다
각 제보에는 [지역] 태그가 붙어 있습니다. 지역이 다르면 sub_category나 문제 유형이
같아 보여도 절대 같은 그룹으로 묶지 마세요 (예: "여울동"의 환승 문제와 "향남읍"의
환승 문제는 물리적으로 다른 장소이므로 반드시 별도 그룹입니다). 지역이 같을 때만
세부 위치(location_name)를 보고 같은 근본 문제인지 판단하세요.

# 절대 규칙 — sub_category가 같아도 problem_types가 다르면 다른 그룹입니다
sub_category(예: "환승")는 큰 분류일 뿐, 실제 근본 문제는 problem_types와 요약
문장을 봐야 알 수 있습니다. 예를 들어 "환승"에는 배차간격/혼잡처럼 버스 운행 자체의
문제도 있고, 동선 복잡·안내 표지판 부족처럼 시설 안내의 문제도 있습니다. 이 둘은
같은 지역·같은 sub_category라도 근본 원인과 해결책이 다르므로 반드시 별도 그룹으로
나누세요 (예: "배차간격 과다"/"혼잡" 제보와 "동선 복잡"/"안내 부족" 제보는 둘 다
동탄역 환승 관련이어도 별도 그룹).

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
    | "sub_category"
    | "problem_types"
    | "location_name"
    | "district"
    | "time_pattern"
    | "summary"
  >[]
) {
  const lines = reports.map(
    (r, i) =>
      `${i}. [지역: ${r.district ?? "미상"}] [${r.sub_category}] [문제유형: ${r.problem_types.join(", ") || "미상"}] ${r.location_name} (${r.time_pattern}) - ${r.summary}`
  );
  return `# 제보 목록\n${lines.join("\n")}\n\n위 제보들을 규칙에 따라 그룹으로 묶어 JSON을 출력하세요.`;
}

// Deterministic tag for whether a report's problem is about bus *operation*
// (frequency, crowding, routing — fixed by adding buses/routes) vs. a
// *facility/wayfinding* issue (confusing signage, unclear stop layout — fixed
// by better signage/info, not more buses). Same sub_category ("환승") covers
// both, and relying on the LLM to keep them apart in the grouping step alone
// has proven unreliable in practice (a 동탄역 signage report was still merged
// into the 배차간격 cluster despite an explicit prompt rule). Computing this
// tag in code and enforcing it as a hard split — the same defense-in-depth
// approach already used for cross-district merges — makes the mistake
// structurally impossible instead of hoping the prompt sticks.
const FACILITY_KEYWORDS = [
  "동선",
  "표지판",
  "안내",
  "정차 위치",
  "인도",
  "보도",
  "신호",
  "가로등",
  "방범",
  "편의시설",
  "경사",
];

function classifyProblemTypes(
  problemTypes: string[]
): "facility" | "operational" {
  const isFacility = problemTypes.some((pt) =>
    FACILITY_KEYWORDS.some((keyword) => pt.includes(keyword))
  );
  return isFacility ? "facility" : "operational";
}

// When a district/facility-operational split actually breaks one LLM group
// into multiple sub-clusters, the original group.title/summary describes the
// *whole* mixed group and stops being accurate for each smaller piece (seen
// in practice — a split-off single-report 보행안전 cluster kept the title
// "여울동 동탄역 환승 문제" and a summary about "배차간격, 혼잡" that no longer
// applied to it at all). Regenerate a title/summary from the sub-cluster's
// own reports instead of reusing the parent group's, whenever a split
// actually happened. Deterministic templating, not another LLM call — this
// only needs to be locally accurate, not polished prose.
function describeSplitCluster(
  members: SavedReport[],
  fallbackTitle: string,
  fallbackSummary: string
): { title: string; summary: string } {
  const district = members[0].district ?? "화성시";
  const subCategories = new Set(members.map((m) => m.sub_category));

  if (subCategories.size > 1) {
    // Split by district only (facility/operational classification agrees) —
    // the parent title/summary still describes the shared sub_category
    // problem accurately, just for fewer reports.
    return { title: fallbackTitle, summary: fallbackSummary };
  }

  const [subCategory] = [...subCategories];
  const problemTypeCounts = new Map<string, number>();
  for (const member of members) {
    for (const pt of member.problem_types) {
      problemTypeCounts.set(pt, (problemTypeCounts.get(pt) ?? 0) + 1);
    }
  }
  const topProblemType = [...problemTypeCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  const title = topProblemType
    ? `${district} ${topProblemType}`.slice(0, 20)
    : `${district} ${subCategory}`.slice(0, 20);

  const locationNames = [...new Set(members.map((m) => m.location_name))];
  const summary =
    members.length === 1
      ? members[0].summary
      : `${district} 일대에서 ${locationNames.slice(0, 3).join(", ")} 등 ${members.length}건의 ${subCategory} 관련 제보(${topProblemType ?? subCategory})가 접수되었습니다.`;

  return { title, summary };
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

// Batches are processed independently, so two reports about the same
// district-wide issue can only end up in the same cluster if they land in
// the same batch. Sorting by district before chunking keeps each district's
// reports contiguous (and thus batched together whenever the district has
// <= MAX_BATCH_SIZE reports), instead of splitting one district's reports
// across arbitrary batches by insertion order.
function sortByDistrict(reports: SavedReport[]): SavedReport[] {
  return [...reports].sort((a, b) => {
    const da = a.district ?? "";
    const db = b.district ?? "";
    return da.localeCompare(db);
  });
}

// Safety net for the case a district still spans multiple batches (more
// reports in one district than MAX_BATCH_SIZE): merge same-district clusters
// that describe the same underlying sub_category after all batches finish,
// so the admin view shows one grouped issue instead of several fragments.
async function mergeSameDistrictSubCategoryClusters() {
  const { data: clusters, error } = await supabaseServer
    .from("clusters")
    .select("id, title, summary, district, representative_report_id");
  if (error || !clusters) return;

  const { data: allMembers, error: membersError } = await supabaseServer
    .from("reports")
    .select("id, cluster_id, sub_category, problem_types")
    .not("cluster_id", "is", null);
  if (membersError || !allMembers) return;

  const subCategoryByCluster = new Map<string, Set<string>>();
  const classificationByCluster = new Map<
    string,
    Set<"facility" | "operational">
  >();
  const memberCountByCluster = new Map<string, number>();
  for (const member of allMembers) {
    if (!member.cluster_id) continue;
    const set = subCategoryByCluster.get(member.cluster_id) ?? new Set();
    set.add(member.sub_category);
    subCategoryByCluster.set(member.cluster_id, set);

    const classificationSet =
      classificationByCluster.get(member.cluster_id) ?? new Set();
    classificationSet.add(classifyProblemTypes(member.problem_types ?? []));
    classificationByCluster.set(member.cluster_id, classificationSet);

    memberCountByCluster.set(
      member.cluster_id,
      (memberCountByCluster.get(member.cluster_id) ?? 0) + 1
    );
  }

  // Same district + same sub_category isn't enough on its own — sub_category
  // is a coarse bucket (e.g. "환승" covers both bus dispatch-interval
  // complaints and unrelated wayfinding/signage complaints at the same
  // station). Only merge clusters that also share the same problem
  // classification (facility vs operational — see classifyProblemTypes), so
  // this safety net can't re-merge groups the model correctly split by root
  // cause.
  const groups = new Map<string, typeof clusters>();
  for (const cluster of clusters) {
    if (!cluster.district) continue;
    const subCategories = subCategoryByCluster.get(cluster.id);
    const classifications = classificationByCluster.get(cluster.id);
    if (!subCategories || subCategories.size !== 1) continue;
    if (!classifications || classifications.size !== 1) continue;
    const [subCategory] = [...subCategories];
    const [classification] = [...classifications];
    const key = `${cluster.district}::${subCategory}::${classification}`;
    const list = groups.get(key) ?? [];
    list.push(cluster);
    groups.set(key, list);
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    const primary = group.reduce((biggest, c) =>
      (memberCountByCluster.get(c.id) ?? 0) >
      (memberCountByCluster.get(biggest.id) ?? 0)
        ? c
        : biggest
    );
    const rest = group.filter((c) => c.id !== primary.id);

    const { error: reassignError } = await supabaseServer
      .from("reports")
      .update({ cluster_id: primary.id })
      .in(
        "cluster_id",
        rest.map((c) => c.id)
      );
    if (reassignError) {
      console.error(
        "POST /api/cluster: failed to merge duplicate district clusters",
        reassignError
      );
      continue;
    }

    const { error: deleteError } = await supabaseServer
      .from("clusters")
      .delete()
      .in(
        "id",
        rest.map((c) => c.id)
      );
    if (deleteError) {
      console.error(
        "POST /api/cluster: failed to delete merged clusters",
        deleteError
      );
      continue;
    }

    const totalCount = group.reduce(
      (sum, c) => sum + (memberCountByCluster.get(c.id) ?? 0),
      0
    );
    await supabaseServer
      .from("clusters")
      .update({ report_count: totalCount })
      .eq("id", primary.id);
  }
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

  const batches = chunk(sortByDistrict(reports), MAX_BATCH_SIZE);
  let clustersCreated = 0;
  let reportsClustered = 0;
  let batchesFailed = 0;
  // A batch that fails twice used to be dropped silently — its reports stayed
  // cluster_id: null forever unless someone happened to notice and re-ran
  // POST /api/cluster again. Collect failed batches instead, so they get one
  // more attempt after every other batch has been processed (a transient
  // LLM/API hiccup on one batch shouldn't need a manual retry to resolve),
  // and so any reports still unclustered after that are visible in the
  // response instead of disappearing without a trace.
  const permanentlyFailedBatches: SavedReport[][] = [];

  async function processBatch(batch: SavedReport[]): Promise<boolean> {
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
        return false;
      }
    }

    for (const group of groups) {
      const members = group.report_indices.map((idx) => batch[idx]);

      // Defense in depth: even with district context in the prompt, the
      // model can still merge reports from different physical areas (seen
      // in practice — a 향남읍 report merged into a 동탄역/여울동 group), or
      // merge a facility/wayfinding complaint into an operational (dispatch
      // interval/crowding) group that shares the same sub_category (seen in
      // practice — a 동탄역 환승주차장 signage report merged into the
      // 배차간격 cluster). Split any group spanning multiple districts or
      // multiple problem-type classifications into separate sub-groups
      // before persisting, so a prompting mistake can never produce a
      // cluster that mixes unrelated locations or unrelated root causes.
      const bySplitKey = new Map<string, SavedReport[]>();
      for (const member of members) {
        const districtKey = member.district ?? "__unknown__";
        const classification = classifyProblemTypes(member.problem_types);
        const key = `${districtKey}::${classification}`;
        const list = bySplitKey.get(key) ?? [];
        list.push(member);
        bySplitKey.set(key, list);
      }

      const splitHappened = bySplitKey.size > 1;

      for (const [, districtMembers] of bySplitKey) {
        const district = districtMembers[0].district ?? null;
        const { title, summary } = splitHappened
          ? describeSplitCluster(districtMembers, group.title, group.summary)
          : { title: group.title, summary: group.summary };

        const { data: cluster, error: clusterError } = await supabaseServer
          .from("clusters")
          .insert({
            title,
            summary,
            district,
            report_count: districtMembers.length,
            representative_report_id: districtMembers[0].id,
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
            districtMembers.map((m) => m.id)
          );

        if (updateError) {
          console.error(
            "POST /api/cluster: failed to assign cluster_id",
            updateError
          );
          continue;
        }

        clustersCreated += 1;
        reportsClustered += districtMembers.length;
      }
    }

    return true;
  }

  for (const batch of batches) {
    const ok = await processBatch(batch);
    if (!ok) permanentlyFailedBatches.push(batch);
  }

  // Give every batch that failed twice one more pass after the rest of the
  // run has completed, instead of leaving its reports unclustered until
  // someone notices and calls this endpoint again by hand.
  const stillFailedBatches: SavedReport[][] = [];
  for (const batch of permanentlyFailedBatches) {
    const ok = await processBatch(batch);
    if (!ok) stillFailedBatches.push(batch);
  }
  batchesFailed = stillFailedBatches.length;
  const reportsUnclustered = stillFailedBatches.reduce(
    (sum, batch) => sum + batch.length,
    0
  );

  if (clustersCreated === 0 && batchesFailed > 0) {
    return NextResponse.json(
      { error: "AI 클러스터링에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  await mergeSameDistrictSubCategoryClusters();

  return NextResponse.json({
    clusters_created: clustersCreated,
    reports_clustered: reportsClustered,
    batches_failed: batchesFailed,
    reports_unclustered: reportsUnclustered,
  });
}
