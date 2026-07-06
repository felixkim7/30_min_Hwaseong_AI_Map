"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/copy";
import type { TransitResponse } from "@/app/api/transit/route";

function formatMinutes(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  const minutes = Math.round(seconds / 60);
  return `${minutes}${copy.admin.transitEvidence.minutesSuffix}`;
}

function crowdedLabel(level: number | null | undefined): string | null {
  if (level == null || level < 1 || level > 4) return null;
  return copy.admin.transitEvidence.crowdedLevels[level - 1];
}

export function TransitEvidence({
  stationId,
  routeId,
  staOrder,
  note,
}: {
  stationId: string;
  routeId: string;
  staOrder: string;
  note: string;
}) {
  const [data, setData] = useState<TransitResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/transit?stationId=${stationId}&routeId=${routeId}&staOrder=${staOrder}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json as TransitResponse);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, routeId, staOrder]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.admin.transitEvidence.title}
        </h2>
        {data && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              data.source === "live"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {data.source === "live"
              ? copy.admin.transitEvidence.liveLabel
              : copy.admin.transitEvidence.cachedLabel}
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {copy.admin.transitEvidence.error}
        </p>
      )}

      {!error && !data && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copy.admin.transitEvidence.loading}
        </p>
      )}

      {data && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            <span className="font-medium">
              {copy.admin.transitEvidence.routeLabel} {data.item.routeName}
            </span>
            <span>·</span>
            <span>
              {copy.admin.transitEvidence.stationLabel}{" "}
              {data.item.stationNm1 ?? data.item.stationId}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {copy.admin.transitEvidence.arrival1}
              </p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatMinutes(data.item.predictTimeSec1) ?? "-"}
              </p>
              {crowdedLabel(data.item.crowded1) && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {copy.admin.transitEvidence.crowdedLabel}:{" "}
                  {crowdedLabel(data.item.crowded1)}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {copy.admin.transitEvidence.arrival2}
              </p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatMinutes(data.item.predictTimeSec2) ?? "-"}
              </p>
              {crowdedLabel(data.item.crowded2) && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {copy.admin.transitEvidence.crowdedLabel}:{" "}
                  {crowdedLabel(data.item.crowded2)}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {new Date(data.fetched_at).toLocaleString("ko-KR")}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{note}</p>
        </div>
      )}
    </div>
  );
}
