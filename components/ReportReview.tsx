"use client";

import { useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import type { ReportAnalysis } from "@/lib/schema";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <dt className="w-32 shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

export function ReportReview({
  analysis,
  onEdit,
}: {
  analysis: ReportAnalysis;
  onEdit: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? copy.review.saveError);
      }
      setConfirmed(true);
    } catch {
      setSaveError(copy.review.saveError);
    } finally {
      setIsSaving(false);
    }
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
            {copy.review.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.review.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800 sm:p-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {copy.review.maskedTextLabel}
            </span>
            <p className="whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {analysis.masked_text}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {copy.review.summaryLabel}
            </span>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {analysis.summary}
            </p>
          </div>

          <dl className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <ReviewRow
              label={copy.review.subCategoryLabel}
              value={analysis.sub_category}
            />
            <ReviewRow
              label={copy.review.problemTypesLabel}
              value={
                analysis.problem_types.length > 0
                  ? analysis.problem_types.join(", ")
                  : "-"
              }
            />
            <ReviewRow
              label={copy.review.locationLabel}
              value={analysis.location_name}
            />
            <ReviewRow
              label={copy.review.timePatternLabel}
              value={analysis.time_pattern}
            />
            <ReviewRow
              label={copy.review.transportModeLabel}
              value={analysis.transport_mode}
            />
            <ReviewRow
              label={copy.review.severityLabel}
              value={String(analysis.severity)}
            />
            <ReviewRow
              label={copy.review.targetGroupsLabel}
              value={
                analysis.target_groups.length > 0
                  ? analysis.target_groups.join(", ")
                  : "-"
              }
            />
          </dl>

          {analysis.suggested_policies.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {copy.review.suggestedPoliciesLabel}
              </span>
              <ul className="list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
                {analysis.suggested_policies.map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {confirmed ? (
            <div className="flex flex-col gap-3 rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-950/40">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {copy.review.saveSuccess}
              </p>
              <Link
                href="/"
                className="mx-auto flex h-10 w-fit items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {copy.appName}
              </Link>
            </div>
          ) : (
            <>
              {saveError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {saveError}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={isSaving}
                  className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  {copy.review.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={isSaving}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {isSaving ? copy.review.saving : copy.review.confirm}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
