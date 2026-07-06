import "server-only";
import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { supabaseServer } from "@/lib/supabase/server";
import {
  createPolicyReportRequestSchema,
  clusterSchema,
  savedReportSchema,
  type SavedReport,
  type Cluster,
} from "@/lib/schema";
import { SCORE_FACTOR_LABELS } from "@/lib/scoring";

const REQUIRED_HEADINGS = [
  "현황",
  "반복 제보 요약",
  "문제 원인 추정",
  "단기 개선안",
  "중장기 검토안",
  "관련 시정 방향",
  "기대효과",
];

const SYSTEM_PROMPT = `당신은 화성시 교통 정책 담당자를 돕는 보고서 작성 도우미입니다.
시민 제보 클러스터 하나의 데이터를 받아 담당 공무원이 실제로 검토할 수 있는
한 페이지 분량의 정책 검토 보고서를 한국어 마크다운으로 작성하세요.

# 절대 규칙
- 아래 7개 섹션을 "## 제목" 형식의 마크다운 헤딩으로 정확히 이 순서와 이름으로
  작성하세요: 현황, 반복 제보 요약, 문제 원인 추정, 단기 개선안, 중장기 검토안,
  관련 시정 방향, 기대효과.
- 주어진 클러스터 데이터(제보 건수, 위치, 시간대, 교통수단, 우선순위 점수와
  세부 내역, 각 제보 요약)에 실제로 근거해서 작성하세요. 일반론적인 뻔한 말이 아니라
  이 클러스터의 구체적 사실(지역명, 건수, 시간대, 점수 등)을 인용하세요.
- "현황" 또는 "반복 제보 요약" 섹션에 주어진 우선순위 점수 숫자(100점 만점)를
  반드시 그대로 한 번 이상 인용하세요 (예: "우선순위 점수 66.5점"). 절대로 새로
  만들거나 다른 숫자로 바꾸지 마세요. 점수의 산출 근거(세부 내역)도 있는 그대로
  설명하세요.
- "관련 시정 방향" 섹션에서는 화성시의 현재 정책 방향(30분 생활권, 광역·급행버스,
  심야 안심귀가, 순환철도) 중 이 클러스터와 실제로 관련 있는 것만 언급하세요.
  관련 없으면 억지로 끼워 넣지 마세요.
- "기대효과" 섹션 끝에 짧게 "※ 본 보고서는 시민 제보를 구조화한 참고 자료이며,
  최종 정책 결정은 수요·예산·법적 절차를 거쳐 담당 부서가 판단합니다." 문구를
  덧붙이세요.
- 실제 공공데이터가 아직 연동되지 않았다면, "문제 원인 추정" 또는 "기대효과"
  섹션에 "※ 정류장별 배차 실적 등 공공데이터 연동 시 이 부분에 실측 근거를
  추가할 수 있습니다." 같은 한 줄 메모를 자연스럽게 넣어 향후 확장 지점을
  표시하세요 (phase 08에서 실제 데이터로 대체 예정).
- 마크다운 본문만 출력하세요. 코드 블록으로 감싸지 마세요.`;

function buildUserPrompt(cluster: Cluster, members: SavedReport[]) {
  const breakdown = cluster.score_breakdown;
  const breakdownLines = breakdown
    ? (Object.keys(SCORE_FACTOR_LABELS) as Array<keyof typeof SCORE_FACTOR_LABELS>)
        .map(
          (factor) =>
            `  - ${SCORE_FACTOR_LABELS[factor]}: ${breakdown[factor].toFixed(2)} (가중치 ${breakdown.weights[factor]})`
        )
        .join("\n")
    : "  - (아직 점수가 계산되지 않음)";

  const reportLines = members
    .map(
      (r, i) =>
        `${i + 1}. [${r.sub_category}] ${r.location_name} / ${r.time_pattern} / ${r.transport_mode} / 심각도 ${r.severity} / 이용자: ${r.target_groups.join(", ") || "미상"}\n   요약: ${r.summary}`
    )
    .join("\n");

  return `# 클러스터 정보
제목: ${cluster.title}
요약: ${cluster.summary ?? "-"}
지역: ${cluster.district ?? "미상"}
제보 건수: ${cluster.report_count}
우선순위 점수: ${cluster.priority_score ?? "미산출"} / 100
점수 세부 내역:
${breakdownLines}

# 포함된 제보 목록
${reportLines}

위 데이터를 근거로 규칙에 따라 정책 검토 보고서를 마크다운으로 작성하세요.`;
}

function validateReportStructure(markdown: string, cluster: Cluster): boolean {
  const hasAllHeadings = REQUIRED_HEADINGS.every((heading) =>
    markdown.includes(`## ${heading}`)
  );
  if (!hasAllHeadings) return false;

  if (cluster.priority_score !== null) {
    const scoreText = String(cluster.priority_score);
    if (!markdown.includes(scoreText)) return false;
  }

  return true;
}

async function requestPolicyReport(cluster: Cluster, members: SavedReport[]) {
  const raw = await callLLM({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(cluster, members),
    jsonMode: false,
  });
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  const markdown = fenceMatch ? fenceMatch[1].trim() : trimmed;

  if (!validateReportStructure(markdown, cluster)) {
    throw new Error(
      "Generated report is missing required section headings or the priority score citation."
    );
  }

  return markdown;
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

  const parsed = createPolicyReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "cluster_id가 필요합니다." },
      { status: 400 }
    );
  }

  const { data: clusterData, error: clusterError } = await supabaseServer
    .from("clusters")
    .select("*")
    .eq("id", parsed.data.cluster_id)
    .single();

  if (clusterError || !clusterData) {
    return NextResponse.json(
      { error: "클러스터를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const cluster = clusterSchema.parse(clusterData);

  const { data: membersData, error: membersError } = await supabaseServer
    .from("reports")
    .select("*")
    .eq("cluster_id", cluster.id);

  if (membersError || !membersData || membersData.length === 0) {
    return NextResponse.json(
      { error: "클러스터에 포함된 제보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const members = savedReportSchema.array().parse(membersData);

  let markdown: string;
  try {
    markdown = await requestPolicyReport(cluster, members);
  } catch (firstError) {
    try {
      markdown = await requestPolicyReport(cluster, members);
    } catch (secondError) {
      console.error(
        "POST /api/policy-report: generation failed twice",
        firstError,
        secondError
      );
      return NextResponse.json(
        { error: "정책 보고서 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 }
      );
    }
  }

  const { data: saved, error: saveError } = await supabaseServer
    .from("policy_reports")
    .insert({ cluster_id: cluster.id, content_md: markdown })
    .select()
    .single();

  if (saveError || !saved) {
    console.error("POST /api/policy-report: failed to persist", saveError);
    return NextResponse.json(
      { error: "보고서 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ policy_report: saved });
}
