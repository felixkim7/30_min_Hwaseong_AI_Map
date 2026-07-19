import Link from "next/link";
import { copy } from "@/lib/copy";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { supabaseServer } from "@/lib/supabase/server";
import { savedReportSchema } from "@/lib/schema";
import { ClusterMap } from "@/components/ClusterMap";
import { ReportCard } from "@/components/ReportCard";

const FIELD_LABELS = {
  sub_category: copy.admin.reportsByField.subCategoryTitle,
  district: copy.admin.reportsByField.districtTitle,
} as const;

type AllowedField = keyof typeof FIELD_LABELS;

function isAllowedField(field: string | undefined): field is AllowedField {
  return field === "sub_category" || field === "district";
}

export default async function AdminReportsByFieldPage({
  searchParams,
}: {
  searchParams: Promise<{ field?: string; value?: string }>;
}) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return <AdminLoginForm />;
  }

  const { field, value } = await searchParams;

  if (!isAllowedField(field) || !value) {
    return (
      <div className="flex flex-1 flex-col gap-4 bg-zinc-50 px-4 py-6 dark:bg-black sm:px-6">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {copy.admin.reportsByField.back}
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">
          {copy.admin.reportsByField.invalidField}
        </p>
      </div>
    );
  }

  const { data, error } = await supabaseServer
    .from("reports")
    .select("*")
    .eq(field, value)
    .order("created_at", { ascending: false });

  const reports = error ? [] : savedReportSchema.array().parse(data);

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 px-4 py-6 dark:bg-black sm:px-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {copy.admin.reportsByField.back}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {FIELD_LABELS[field]}: {copy.admin.reportsByField.title(value)}
        </h1>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copy.admin.reportsByField.empty}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {copy.admin.reportsByField.mapTitle}
            </h2>
            <ClusterMap members={reports} />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {copy.admin.reportsByField.listTitle} ({reports.length})
            </h2>
            <div className="flex flex-col gap-2">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
