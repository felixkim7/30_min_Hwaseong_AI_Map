"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { copy } from "@/lib/copy";
import {
  timePatternOptions,
  transportModeOptions,
  subCategoryOptions,
} from "@/lib/schema";
import type { SavedReport } from "@/lib/schema";
import { resolveLocation, districtOptions } from "@/lib/geocode";
import type { PlottedReport } from "@/components/ReportMap";

const ReportMap = dynamic(
  () => import("@/components/ReportMap").then((mod) => mod.ReportMap),
  { ssr: false }
);

type Filters = {
  district: string;
  transportMode: string;
  timePattern: string;
  subCategory: string;
};

const initialFilters: Filters = {
  district: "",
  transportMode: "",
  timePattern: "",
  subCategory: "",
};

export default function MapPage() {
  const [reports, setReports] = useState<SavedReport[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reports")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setReports(data.reports as SavedReport[]);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const plottedReports = useMemo<PlottedReport[]>(() => {
    if (!reports) return [];
    return reports.map((report) => {
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
  }, [reports]);

  const filteredReports = useMemo(() => {
    return plottedReports.filter((report) => {
      if (filters.district && report.district !== filters.district)
        return false;
      if (
        filters.transportMode &&
        report.transport_mode !== filters.transportMode
      )
        return false;
      if (filters.timePattern && report.time_pattern !== filters.timePattern)
        return false;
      if (filters.subCategory && report.sub_category !== filters.subCategory)
        return false;
      return true;
    });
  }, [plottedReports, filters]);

  const topIssues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of filteredReports) {
      counts.set(
        report.sub_category,
        (counts.get(report.sub_category) ?? 0) + 1
      );
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredReports]);

  const hasActiveFilters =
    filters.district ||
    filters.transportMode ||
    filters.timePattern ||
    filters.subCategory;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex flex-col gap-2 px-4 pt-6 sm:px-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← {copy.appName}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {copy.map.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copy.map.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-6">
        <FilterSelect
          label={copy.map.filters.district}
          value={filters.district}
          onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
          options={districtOptions}
        />
        <FilterSelect
          label={copy.map.filters.transportMode}
          value={filters.transportMode}
          onChange={(v) => setFilters((f) => ({ ...f, transportMode: v }))}
          options={transportModeOptions}
        />
        <FilterSelect
          label={copy.map.filters.timePattern}
          value={filters.timePattern}
          onChange={(v) => setFilters((f) => ({ ...f, timePattern: v }))}
          options={timePatternOptions}
        />
        <FilterSelect
          label={copy.map.filters.subCategory}
          value={filters.subCategory}
          onChange={(v) => setFilters((f) => ({ ...f, subCategory: v }))}
          options={subCategoryOptions}
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setFilters(initialFilters)}
            className="h-9 rounded-full border border-zinc-300 px-3 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {copy.map.filters.reset}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 sm:px-6 lg:flex-row">
        <div className="relative h-[420px] w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 lg:h-[600px] lg:flex-1">
          {loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-white text-sm text-red-600 dark:bg-zinc-950 dark:text-red-400">
              <p>{copy.map.loadError}</p>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/40"
              >
                {copy.map.retry}
              </button>
            </div>
          ) : reports === null ? (
            <div className="flex h-full items-center justify-center bg-white text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              {copy.map.loading}
            </div>
          ) : (
            <>
              <ReportMap reports={filteredReports} />
              {filteredReports.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
                  <p className="pointer-events-auto rounded-lg bg-white/95 px-4 py-2 text-sm text-zinc-600 shadow-sm dark:bg-zinc-950/95 dark:text-zinc-300">
                    {copy.map.empty}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="flex w-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800 lg:w-80">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {copy.map.topIssues.title}
          </h2>
          {reports !== null && !loadError && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {filteredReports.length}
              {copy.map.resultCount}
            </p>
          )}
          {topIssues.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {copy.map.topIssues.empty}
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {topIssues.map(([subCategory, count], index) => (
                <li
                  key={subCategory}
                  className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                >
                  <span className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                      {index + 1}
                    </span>
                    {subCategory}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {count}
                    {copy.map.topIssues.countSuffix}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <option value="">{copy.map.filters.all}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
