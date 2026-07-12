"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/copy";
import type { TransitResponse } from "@/app/api/transit/route";
import type { GbisArrivalItem } from "@/lib/gbis";

function formatMinutes(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  const minutes = Math.round(seconds / 60);
  return `${minutes}${copy.admin.transitEvidence.minutesSuffix}`;
}

function crowdedLabel(level: number | null | undefined): string | null {
  if (level == null || level < 1 || level > 4) return null;
  return copy.admin.transitEvidence.crowdedLevels[level - 1];
}

function RouteArrivalCard({ item }: { item: GbisArrivalItem }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {copy.admin.transitEvidence.routeLabel} {item.routeName}
      </span>
      <div className="mt-1 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {copy.admin.transitEvidence.arrival1}
          </p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMinutes(item.predictTimeSec1) ?? "-"}
          </p>
          {item.stationNm1 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.admin.transitEvidence.currentLocationLabel}: {item.stationNm1}
            </p>
          )}
          {crowdedLabel(item.crowded1) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.admin.transitEvidence.crowdedLabel}: {crowdedLabel(item.crowded1)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {copy.admin.transitEvidence.arrival2}
          </p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMinutes(item.predictTimeSec2) ?? "-"}
          </p>
          {item.stationNm2 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.admin.transitEvidence.currentLocationLabel}: {item.stationNm2}
            </p>
          )}
          {crowdedLabel(item.crowded2) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.admin.transitEvidence.crowdedLabel}: {crowdedLabel(item.crowded2)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TransitEvidence({
  stationId,
  stationName,
  note,
}: {
  stationId: string;
  stationName: string;
  note: string;
}) {
  const [data, setData] = useState<TransitResponse | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/transit?stationId=${stationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json as TransitResponse);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, retryKey]);

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

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {copy.admin.transitEvidence.stationLabel}: {stationName}
      </p>

      {error && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-600 dark:text-red-400">
            {copy.admin.transitEvidence.error}
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="w-fit rounded-full border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/40"
          >
            {copy.admin.transitEvidence.retry}
          </button>
        </div>
      )}

      {!error && !data && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copy.admin.transitEvidence.loading}
        </p>
      )}

      {data && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.items.map((item) => (
              <RouteArrivalCard key={item.routeId} item={item} />
            ))}
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
