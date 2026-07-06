import type { SavedReport } from "@/lib/schema";

export type AdminKpis = {
  totalReports: number;
  newThisWeek: number;
  topSubCategory: string | null;
  topDistrict: string | null;
  nightGapReports: number;
  vulnerableReports: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const VULNERABLE_GROUPS = new Set(["고령자", "장애인"]);

function mode(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function computeAdminKpis(reports: SavedReport[]): AdminKpis {
  const now = Date.now();

  const newThisWeek = reports.filter(
    (r) => now - new Date(r.created_at).getTime() <= WEEK_MS
  ).length;

  const nightGapReports = reports.filter(
    (r) => r.sub_category === "심야귀가" || r.time_pattern === "심야"
  ).length;

  const vulnerableReports = reports.filter(
    (r) =>
      r.sub_category === "교통약자" ||
      r.target_groups.some((g) => VULNERABLE_GROUPS.has(g))
  ).length;

  return {
    totalReports: reports.length,
    newThisWeek,
    topSubCategory: mode(reports.map((r) => r.sub_category)),
    topDistrict: mode(reports.map((r) => r.district)),
    nightGapReports,
    vulnerableReports,
  };
}

export function countByKey(
  reports: SavedReport[],
  key: "sub_category" | "district"
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reports) {
    const value = r[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
