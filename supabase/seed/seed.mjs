// Resets the DB to a known demo state: wipes reports/clusters/policy_reports,
// inserts the curated seed reports from reports.json (geocoded via Kakao),
// then runs clustering + scoring so the admin dashboard is pre-populated.
//
// Usage: node supabase/seed/seed.mjs
// Requires the dev server running at http://localhost:3000 (for /api/cluster
// and /api/score, which call the LLM/GBIS) and .env.local filled in.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..");

const env = Object.fromEntries(
  readFileSync(join(projectRoot, ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const APP_URL = env.SEED_APP_URL || "http://localhost:3000";

const VALID_TIME_PATTERNS = ["평일 출근", "평일 퇴근", "주말", "심야", "상시"];
const VALID_TRANSPORT_MODES = ["버스", "지하철·철도", "자동차", "보행", "택시", "기타"];
const VALID_TARGET_GROUPS = ["직장인", "학생", "고령자", "장애인", "보호자"];
const VALID_SUB_CATEGORIES = [
  "버스 배차",
  "환승",
  "심야귀가",
  "도로정체",
  "보행안전",
  "교통약자",
  "기타",
];

function validateReport(report, index) {
  const errors = [];
  if (!report.masked_text) errors.push("missing masked_text");
  if (report.category !== "교통") errors.push("category must be 교통");
  if (!VALID_SUB_CATEGORIES.includes(report.sub_category))
    errors.push(`invalid sub_category: ${report.sub_category}`);
  if (!report.location_name) errors.push("missing location_name");
  if (!VALID_TIME_PATTERNS.includes(report.time_pattern))
    errors.push(`invalid time_pattern: ${report.time_pattern}`);
  if (!VALID_TRANSPORT_MODES.includes(report.transport_mode))
    errors.push(`invalid transport_mode: ${report.transport_mode}`);
  if (
    typeof report.severity !== "number" ||
    report.severity < 1 ||
    report.severity > 5
  )
    errors.push(`invalid severity: ${report.severity}`);
  for (const g of report.target_groups ?? []) {
    if (!VALID_TARGET_GROUPS.includes(g)) errors.push(`invalid target_group: ${g}`);
  }
  if (!report.summary) errors.push("missing summary");

  if (errors.length > 0) {
    throw new Error(`Report #${index} invalid: ${errors.join(", ")}`);
  }
}

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log("=== Step 1: wipe existing data ===");
for (const table of ["policy_reports", "clusters", "reports"]) {
  const { error, count } = await service
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) {
    console.error(`Failed to wipe ${table}:`, error.message);
    process.exit(1);
  }
  console.log(`  wiped ${table}: ${count} rows`);
}

console.log("\n=== Step 2: validate + insert seed reports ===");
const reports = JSON.parse(
  readFileSync(join(__dirname, "reports.json"), "utf-8")
);
reports.forEach(validateReport);
console.log(`  ${reports.length} reports validated OK`);

let inserted = 0;
for (const report of reports) {
  const res = await fetch(`${APP_URL}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`  [FAILED] ${report.location_name}: HTTP ${res.status} ${body}`);
    continue;
  }
  inserted += 1;
  process.stdout.write(`  inserted ${inserted}/${reports.length}\r`);
}
console.log(`\n  inserted ${inserted}/${reports.length} reports (with geocoding)`);

console.log("\n=== Step 3: run clustering ===");
const clusterRes = await fetch(`${APP_URL}/api/cluster`, { method: "POST" });
const clusterBody = await clusterRes.json();
if (!clusterRes.ok) {
  console.error("  clustering failed:", clusterBody);
  process.exit(1);
}
console.log(
  `  clusters_created: ${clusterBody.clusters_created}, reports_clustered: ${clusterBody.reports_clustered}`
);

console.log("\n=== Step 4: run scoring ===");
const scoreRes = await fetch(`${APP_URL}/api/score`, { method: "POST" });
const scoreBody = await scoreRes.json();
if (!scoreRes.ok) {
  console.error("  scoring failed:", scoreBody);
  process.exit(1);
}
console.log(`  clusters_scored: ${scoreBody.clusters_scored}`);

console.log("\nSeed complete.");
