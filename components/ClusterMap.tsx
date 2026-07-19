"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { resolveLocation } from "@/lib/geocode";
import type { SavedReport } from "@/lib/schema";
import type { PlottedReport } from "@/components/ReportMap";

const ReportMap = dynamic(
  () => import("@/components/ReportMap").then((mod) => mod.ReportMap),
  { ssr: false }
);

export function ClusterMap({ members }: { members: SavedReport[] }) {
  const plottedReports = useMemo<PlottedReport[]>(() => {
    return members.map((report) => {
      if (report.lat != null && report.lng != null) {
        return { ...report, lat: report.lat, lng: report.lng };
      }
      const resolved = resolveLocation(report.location_name);
      return {
        ...report,
        lat: resolved.lat,
        lng: resolved.lng,
        district: report.district ?? resolved.district,
      };
    });
  }, [members]);

  return (
    <div className="h-72 w-full overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
      <ReportMap reports={plottedReports} />
    </div>
  );
}
