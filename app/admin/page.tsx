import Link from "next/link";
import { copy } from "@/lib/copy";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { AdminCharts } from "@/components/AdminCharts";
import { supabaseServer } from "@/lib/supabase/server";
import { savedReportSchema, clusterSchema } from "@/lib/schema";
import { computeAdminKpis, countByKey } from "@/lib/adminStats";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </span>
    </div>
  );
}

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginForm />;
  }

  const [{ data: reportsData, error: reportsError }, { data: clustersData, error: clustersError }] =
    await Promise.all([
      supabaseServer.from("reports").select("*"),
      supabaseServer
        .from("clusters")
        .select("*")
        .order("priority_score", { ascending: false, nullsFirst: false }),
    ]);

  const reports = reportsError ? [] : savedReportSchema.array().parse(reportsData);
  const clusters = clustersError ? [] : clusterSchema.array().parse(clustersData);

  const kpis = computeAdminKpis(reports);
  const bySubCategory = countByKey(reports, "sub_category");
  const byDistrict = countByKey(reports, "district");

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 px-4 py-6 dark:bg-black sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            ← {copy.appName}
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {copy.admin.dashboardTitle}
          </h1>
        </div>
        <AdminLogoutButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={copy.admin.kpis.totalReports} value={kpis.totalReports} />
        <KpiCard label={copy.admin.kpis.newThisWeek} value={kpis.newThisWeek} />
        <KpiCard
          label={copy.admin.kpis.topSubCategory}
          value={kpis.topSubCategory ?? copy.admin.kpis.none}
        />
        <KpiCard
          label={copy.admin.kpis.topDistrict}
          value={kpis.topDistrict ?? copy.admin.kpis.none}
        />
        <KpiCard
          label={copy.admin.kpis.nightGapReports}
          value={kpis.nightGapReports}
        />
        <KpiCard
          label={copy.admin.kpis.vulnerableReports}
          value={kpis.vulnerableReports}
        />
      </div>

      <AdminCharts bySubCategory={bySubCategory} byDistrict={byDistrict} />

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.admin.clusterList.title}
        </h2>
        {clusters.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.admin.clusterList.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clusters.map((cluster, index) => (
              <li key={cluster.id}>
                <Link
                  href={`/admin/clusters/${cluster.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {cluster.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {cluster.district ?? "-"} ·{" "}
                        {copy.admin.clusterList.reportCount}{" "}
                        {cluster.report_count}
                        건
                      </p>
                    </div>
                  </div>
                  {cluster.priority_score !== null && (
                    <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                      {cluster.priority_score}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
