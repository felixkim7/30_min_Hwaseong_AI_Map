"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import type { PolicyReport } from "@/lib/schema";

export function PolicyReportPanel({
  clusterId,
  clusterTitle,
  initialReport,
}: {
  clusterId: string;
  clusterTitle: string;
  initialReport: PolicyReport | null;
}) {
  const [report, setReport] = useState<PolicyReport | null>(initialReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/policy-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cluster_id: clusterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? copy.admin.policyReport.generateError);
      }
      setReport(data.policy_report as PolicyReport);
    } catch {
      setError(copy.admin.policyReport.generateError);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!report) return;
    await navigator.clipboard.writeText(report.content_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!report) return;
    const blob = new Blob([report.content_md], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clusterTitle.replace(/\s+/g, "_")}_정책검토보고서.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.admin.policyReport.title}
        </h2>
        <div className="flex gap-2">
          {report && (
            <>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {copied ? copy.admin.policyReport.copied : copy.admin.policyReport.copy}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {copy.admin.policyReport.download}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isGenerating
              ? copy.admin.policyReport.generating
              : report
                ? copy.admin.policyReport.regenerate
                : copy.admin.policyReport.generate}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="w-fit rounded-full border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
          >
            {copy.admin.policyReport.retry}
          </button>
        </div>
      )}

      {report && (
        <>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {copy.admin.policyReport.generatedAt}:{" "}
            {new Date(report.created_at).toLocaleString("ko-KR")}
          </p>
          <pre className="max-h-[600px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {report.content_md}
          </pre>
        </>
      )}
    </div>
  );
}
