"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import {
  reportInputSchema,
  timePatternOptions,
  transportModeOptions,
  targetGroupOptions,
  reportAnalysisSchema,
  type ReportInput,
  type ReportAnalysis,
} from "@/lib/schema";
import { ReportReview } from "@/components/ReportReview";

type FormState = {
  description: string;
  locationName: string;
  timePattern: string;
  transportMode: string;
  targetGroups: string[];
  severity: number;
};

const initialState: FormState = {
  description: "",
  locationName: "",
  timePattern: "",
  transportMode: "",
  targetGroups: [],
  severity: 3,
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export default function ReportPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<ReportInput | null>(null);

  function toggleTargetGroup(group: string) {
    setForm((prev) => ({
      ...prev,
      targetGroups: prev.targetGroups.includes(group)
        ? prev.targetGroups.filter((g) => g !== group)
        : [...prev.targetGroups, group],
    }));
  }

  async function runAnalysis(payload: ReportInput) {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? copy.report.analyzeError);
      }
      const parsed = reportAnalysisSchema.parse(data);
      setAnalysis(parsed);
    } catch {
      setAnalyzeError(copy.report.analyzeError);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const result = reportInputSchema.safeParse({
      description: form.description,
      locationName: form.locationName,
      timePattern: form.timePattern,
      transportMode: form.transportMode,
      targetGroups: form.targetGroups,
      severity: form.severity,
    });

    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLastPayload(result.data);
    void runAnalysis(result.data);
  }

  function handleEdit() {
    setAnalysis(null);
    setAnalyzeError(null);
  }

  if (analysis) {
    return <ReportReview analysis={analysis} onEdit={handleEdit} />;
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black sm:px-6">
      <main className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            ← {copy.appName}
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {copy.report.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.report.subtitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800 sm:p-6"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              {copy.report.descriptionLabel}
            </label>
            <textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={copy.report.descriptionPlaceholder}
              aria-invalid={Boolean(errors.description)}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="locationName"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              {copy.report.locationLabel}
            </label>
            <input
              id="locationName"
              type="text"
              value={form.locationName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, locationName: e.target.value }))
              }
              placeholder={copy.report.locationPlaceholder}
              aria-invalid={Boolean(errors.locationName)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
            />
            {errors.locationName && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.locationName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="timePattern"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                {copy.report.timePatternLabel}
              </label>
              <select
                id="timePattern"
                value={form.timePattern}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, timePattern: e.target.value }))
                }
                aria-invalid={Boolean(errors.timePattern)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
              >
                <option value="" disabled>
                  {copy.report.timePatternPlaceholder}
                </option>
                {timePatternOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.timePattern && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.timePattern}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="transportMode"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                {copy.report.transportModeLabel}
              </label>
              <select
                id="transportMode"
                value={form.transportMode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    transportMode: e.target.value,
                  }))
                }
                aria-invalid={Boolean(errors.transportMode)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
              >
                <option value="" disabled>
                  {copy.report.transportModePlaceholder}
                </option>
                {transportModeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.transportMode && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.transportMode}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {copy.report.targetGroupsLabel}
            </span>
            <div className="flex flex-wrap gap-2">
              {targetGroupOptions.map((group) => {
                const active = form.targetGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleTargetGroup(group)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="severity"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              {copy.report.severityLabel}{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                ({copy.report.severityHint})
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="severity"
                type="range"
                min={1}
                max={5}
                step={1}
                value={form.severity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    severity: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
              <span className="w-6 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {form.severity}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {copy.report.photoLabel}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-dashed border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700"
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {copy.report.photoHint}
            </p>
          </div>

          {analyzeError && (
            <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <p>{analyzeError}</p>
              {lastPayload && (
                <button
                  type="button"
                  onClick={() => void runAnalysis(lastPayload)}
                  className="w-fit rounded-full border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
                >
                  {copy.report.retry}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isAnalyzing}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isAnalyzing ? copy.report.analyzing : copy.report.submit}
          </button>
        </form>
      </main>
    </div>
  );
}
