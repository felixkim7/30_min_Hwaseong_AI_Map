import { copy } from "@/lib/copy";
import type { SavedReport } from "@/lib/schema";

export function ReportCard({
  report,
  isRepresentative,
}: {
  report: SavedReport;
  isRepresentative?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
      {isRepresentative && (
        <span className="w-fit rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
          {copy.admin.clusterDetail.representativeTitle}
        </span>
      )}
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
        <span>심각도 {report.severity}</span>
      </div>
    </div>
  );
}
