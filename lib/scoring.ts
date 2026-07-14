import type { SavedReport, ScoreBreakdown } from "@/lib/schema";

// Transparent weighted formula — see docs/ARCHITECTURE.md "Priority score".
// The LLM may explain a score in words (phase 07), but the number always
// comes from here, never from the model.
export const SCORE_WEIGHTS = {
  recurrence: 0.4,
  safety: 0.22,
  time_sensitivity: 0.13,
  vulnerable_impact: 0.13,
  policy_alignment: 0.08,
  feasibility: 0.04,
} as const;

// Shared Korean labels for each factor — used anywhere a breakdown is shown
// (admin cluster detail, clusters-debug, the policy report prompt).
export const SCORE_FACTOR_LABELS: Record<keyof typeof SCORE_WEIGHTS, string> = {
  recurrence: "반복도",
  safety: "안전",
  time_sensitivity: "시간 민감도",
  vulnerable_impact: "교통약자 영향",
  policy_alignment: "정책 부합도",
  feasibility: "실현 가능성",
};

// A cluster with 10+ reports is treated as maximally recurrent for the demo.
const RECURRENCE_CAP = 10;

const HIGH_SAFETY_SUB_CATEGORIES = new Set(["보행안전", "심야귀가", "교통약자"]);

const TIME_SENSITIVE_PATTERNS = new Set(["평일 출근", "평일 퇴근", "심야"]);

const VULNERABLE_GROUPS = new Set(["고령자", "장애인", "학생", "보호자"]);

// Keywords tied to the mayor's current traffic pledges (see PROJECT_BRIEF.md):
// 30-minute living zone, expanded/express buses, night safe-return transport,
// circular railway. Includes routine bus-service terms (배차, 노선) since bus
// frequency/coverage is itself a core pledge, not just express/night service.
const POLICY_KEYWORDS = [
  "순환철도",
  "순환 철도",
  "급행버스",
  "급행 버스",
  "심야",
  "안심귀가",
  "광역버스",
  "환승",
  "30분",
  "배차",
  "버스 노선",
  "노선 신설",
  "증차",
  "버스",
];

// Sub-categories that are typically fixable with a short-term operational
// tweak (route/signal/stop change) rather than infrastructure buildout.
const HIGH_FEASIBILITY_SUB_CATEGORIES = new Set(["버스 배차", "환승"]);

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function computeScoreBreakdown(
  reports: SavedReport[]
): ScoreBreakdown {
  if (reports.length === 0) {
    throw new Error("Cannot score a cluster with zero reports.");
  }

  const recurrence = clamp01(reports.length / RECURRENCE_CAP);

  const safetySubCategoryScore = average(
    reports.map((r) => (HIGH_SAFETY_SUB_CATEGORIES.has(r.sub_category) ? 1 : 0))
  );
  const severityScore = average(reports.map((r) => (r.severity - 1) / 4));
  const safety = clamp01(safetySubCategoryScore * 0.5 + severityScore * 0.5);

  const time_sensitivity = clamp01(
    average(
      reports.map((r) => (TIME_SENSITIVE_PATTERNS.has(r.time_pattern) ? 1 : 0))
    )
  );

  const vulnerable_impact = clamp01(
    average(
      reports.map((r) =>
        r.target_groups.some((g) => VULNERABLE_GROUPS.has(g)) ? 1 : 0
      )
    )
  );

  const policy_alignment = clamp01(
    average(
      reports.map((r) => {
        const haystack = [
          r.sub_category,
          r.summary,
          ...r.problem_types,
          ...r.suggested_policies,
        ]
          .join(" ")
          .toLowerCase();
        return POLICY_KEYWORDS.some((keyword) =>
          haystack.includes(keyword.toLowerCase())
        )
          ? 1
          : 0;
      })
    )
  );

  const feasibility = clamp01(
    average(
      reports.map((r) =>
        HIGH_FEASIBILITY_SUB_CATEGORIES.has(r.sub_category) ? 1 : 0.4
      )
    )
  );

  return {
    recurrence,
    safety,
    time_sensitivity,
    vulnerable_impact,
    policy_alignment,
    feasibility,
    weights: SCORE_WEIGHTS,
  };
}

export function computePriorityScore(breakdown: ScoreBreakdown): number {
  const raw =
    breakdown.recurrence * breakdown.weights.recurrence +
    breakdown.safety * breakdown.weights.safety +
    breakdown.time_sensitivity * breakdown.weights.time_sensitivity +
    breakdown.vulnerable_impact * breakdown.weights.vulnerable_impact +
    breakdown.policy_alignment * breakdown.weights.policy_alignment +
    breakdown.feasibility * breakdown.weights.feasibility;

  return Math.round(raw * 100 * 100) / 100;
}
