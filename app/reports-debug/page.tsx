import Link from "next/link";
import { copy } from "@/lib/copy";
import { supabaseServer } from "@/lib/supabase/server";
import { savedReportSchema } from "@/lib/schema";

// Temporary confirmation view for phase 03 — proves GET /api/reports works
// end-to-end. Superseded by the real map in phase 04.
export default async function ReportsDebugPage() {
  const { data, error } = await supabaseServer
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  const reports = error ? [] : savedReportSchema.array().parse(data);

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
            {copy.reportsList.title}
          </h1>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error.message}
          </p>
        )}

        {!error && reports.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.reportsList.empty}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800"
            >
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {report.masked_text}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{report.sub_category}</span>
                <span>·</span>
                <span>{report.location_name}</span>
                <span>·</span>
                <span>{report.time_pattern}</span>
                <span>·</span>
                <span>{report.transport_mode}</span>
                <span>·</span>
                <span>심각도 {report.severity}</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
