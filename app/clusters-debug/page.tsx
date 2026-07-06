import Link from "next/link";
import { copy } from "@/lib/copy";
import { supabaseServer } from "@/lib/supabase/server";
import { clusterSchema } from "@/lib/schema";
import { SCORE_WEIGHTS } from "@/lib/scoring";

const FACTOR_LABELS: Record<keyof typeof SCORE_WEIGHTS, string> = {
  recurrence: "반복도",
  safety: "안전",
  time_sensitivity: "시간 민감도",
  vulnerable_impact: "교통약자 영향",
  policy_alignment: "정책 부합도",
  feasibility: "실현 가능성",
};

// Temporary confirmation view for phase 05 — proves /api/cluster and
// /api/score work end-to-end. Superseded by the real admin dashboard in
// phase 06.
export default async function ClustersDebugPage() {
  const { data, error } = await supabaseServer
    .from("clusters")
    .select("*")
    .order("priority_score", { ascending: false, nullsFirst: false });

  const clusters = error ? [] : clusterSchema.array().parse(data);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black sm:px-6">
      <main className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            ← {copy.appName}
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {copy.clustersDebug.title}
          </h1>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error.message}
          </p>
        )}

        {!error && clusters.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.clustersDebug.empty}
          </p>
        )}

        <ul className="flex flex-col gap-4">
          {clusters.map((cluster) => (
            <li
              key={cluster.id}
              className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {cluster.title}
                  </h2>
                  {cluster.summary && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {cluster.summary}
                    </p>
                  )}
                </div>
                {cluster.priority_score !== null && (
                  <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                    {cluster.priority_score}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {copy.clustersDebug.reportCountLabel}: {cluster.report_count}
                </span>
                {cluster.district && <span>· {cluster.district}</span>}
              </div>

              {cluster.score_breakdown && (
                <div className="flex flex-col gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {copy.clustersDebug.breakdownTitle}
                  </span>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-700 dark:text-zinc-300 sm:grid-cols-3">
                    {(
                      Object.keys(FACTOR_LABELS) as Array<
                        keyof typeof FACTOR_LABELS
                      >
                    ).map((factor) => (
                      <li key={factor}>
                        {FACTOR_LABELS[factor]}:{" "}
                        {cluster.score_breakdown![factor].toFixed(2)} (×
                        {cluster.score_breakdown!.weights[factor]})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
