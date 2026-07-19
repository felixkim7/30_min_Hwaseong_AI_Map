import Link from "next/link";
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { supabaseServer } from "@/lib/supabase/server";
import { clusterSchema, savedReportSchema, policyReportSchema } from "@/lib/schema";
import { SCORE_FACTOR_LABELS as FACTOR_LABELS } from "@/lib/scoring";
import { PolicyReportPanel } from "@/components/PolicyReportPanel";
import { TransitEvidence } from "@/components/TransitEvidence";
import { findNearbyStationsForCluster } from "@/lib/transitEvidence";
import { ClusterMap } from "@/components/ClusterMap";
import { ReportCard } from "@/components/ReportCard";

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return <AdminLoginForm />;
  }

  const { id } = await params;

  const { data: clusterData, error: clusterError } = await supabaseServer
    .from("clusters")
    .select("*")
    .eq("id", id)
    .single();

  if (clusterError || !clusterData) {
    notFound();
  }

  const cluster = clusterSchema.parse(clusterData);

  const { data: membersData, error: membersError } = await supabaseServer
    .from("reports")
    .select("*")
    .eq("cluster_id", id)
    .order("created_at", { ascending: false });

  const members = membersError ? [] : savedReportSchema.array().parse(membersData);

  const { data: policyReportData } = await supabaseServer
    .from("policy_reports")
    .select("*")
    .eq("cluster_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestPolicyReport = policyReportData
    ? policyReportSchema.parse(policyReportData)
    : null;

  // Only show bus-stop evidence for clusters actually about bus service —
  // a crosswalk or road-congestion cluster having a bus stop nearby by
  // coincidence isn't relevant evidence for that issue.
  const BUS_RELATED_SUB_CATEGORIES = new Set(["버스 배차", "환승"]);
  const isBusRelated = members.some(
    (m) =>
      m.transport_mode === "버스" || BUS_RELATED_SUB_CATEGORIES.has(m.sub_category)
  );

  let nearbyStations: Awaited<ReturnType<typeof findNearbyStationsForCluster>> =
    [];
  let transitLookupFailed = false;
  if (isBusRelated) {
    try {
      nearbyStations = await findNearbyStationsForCluster(members);
    } catch (error) {
      console.error(
        "ClusterDetailPage: failed to look up nearby stations",
        error
      );
      transitLookupFailed = true;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 px-4 py-6 dark:bg-black sm:px-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {copy.admin.clusterDetail.back}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {cluster.title}
            </h1>
            {cluster.summary && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {cluster.summary}
              </p>
            )}
          </div>
          {cluster.priority_score !== null && (
            <span className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-lg font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
              {cluster.priority_score}
            </span>
          )}
        </div>
      </div>

      {cluster.score_breakdown && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {copy.admin.clusterDetail.breakdownTitle}
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-3">
            {(Object.keys(FACTOR_LABELS) as Array<keyof typeof FACTOR_LABELS>).map(
              (factor) => (
                <li key={factor}>
                  {FACTOR_LABELS[factor]}:{" "}
                  {cluster.score_breakdown![factor].toFixed(2)} (×
                  {cluster.score_breakdown!.weights[factor]})
                </li>
              )
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.admin.clusterDetail.mapTitle}
        </h2>
        <ClusterMap members={members} />
      </div>

      <PolicyReportPanel
        clusterId={cluster.id}
        clusterTitle={cluster.title}
        initialReport={latestPolicyReport}
      />

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.admin.clusterDetail.memberReportsTitle} ({members.length})
        </h2>
        <div className="flex flex-col gap-2">
          {members.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isRepresentative={report.id === cluster.representative_report_id}
            />
          ))}
        </div>
      </div>

      {isBusRelated && nearbyStations.length > 0 && (
        <TransitEvidence
          stations={nearbyStations}
          note={copy.admin.transitEvidence.multiStationNote}
        />
      )}

      {isBusRelated && nearbyStations.length === 0 && !transitLookupFailed && (
        <div className="rounded-2xl bg-white p-4 text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-zinc-800">
          {copy.admin.transitEvidence.empty}
        </div>
      )}

      {isBusRelated && transitLookupFailed && (
        <div className="rounded-2xl bg-white p-4 text-sm text-red-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-red-400 dark:ring-zinc-800">
          {copy.admin.transitEvidence.error}
        </div>
      )}
    </div>
  );
}
