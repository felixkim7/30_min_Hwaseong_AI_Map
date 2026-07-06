import { z } from "zod";

export const timePatternOptions = [
  "평일 출근",
  "평일 퇴근",
  "주말",
  "심야",
  "상시",
] as const;

export const transportModeOptions = [
  "버스",
  "지하철·철도",
  "자동차",
  "보행",
  "택시",
  "기타",
] as const;

export const targetGroupOptions = [
  "직장인",
  "학생",
  "고령자",
  "장애인",
  "보호자",
] as const;

export const subCategoryOptions = [
  "버스 배차",
  "환승",
  "심야귀가",
  "도로정체",
  "보행안전",
  "교통약자",
  "기타",
] as const;

// Raw shape of the citizen-facing form. AI-derived fields (category, summary,
// suggested_policies, etc. — see ARCHITECTURE.md) are added on top of this in
// phase 02, after /api/analyze runs.
export const reportInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "10자 이상 입력해주세요.")
    .max(2000, "2000자 이하로 입력해주세요."),
  locationName: z.string().trim().min(1, "위치/장소명을 입력해주세요."),
  timePattern: z.enum(timePatternOptions, {
    message: "자주 발생하는 시간대를 선택해주세요.",
  }),
  transportMode: z.enum(transportModeOptions, {
    message: "교통수단을 선택해주세요.",
  }),
  targetGroups: z.array(z.enum(targetGroupOptions)).default([]),
  severity: z.number().int().min(1).max(5).default(3),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

// AI output from POST /api/analyze. Extends the citizen's raw input with
// structured classification + masked text. Never store the raw `description`
// — only `masked_text` may be persisted (phase 03).
export const reportAnalysisSchema = z.object({
  masked_text: z.string().min(1),
  category: z.literal("교통"),
  sub_category: z.enum(subCategoryOptions),
  problem_types: z.array(z.string()).default([]),
  location_name: z.string().min(1),
  time_pattern: z.enum(timePatternOptions),
  transport_mode: z.enum(transportModeOptions),
  severity: z.number().int().min(1).max(5),
  target_groups: z.array(z.enum(targetGroupOptions)).default([]),
  summary: z.string().min(1),
  suggested_policies: z.array(z.string()).default([]),
});

export type ReportAnalysis = z.infer<typeof reportAnalysisSchema>;

export const analyzeRequestSchema = z.object({
  description: z.string().trim().min(10).max(2000),
  locationName: z.string().trim().min(1),
  timePattern: z.enum(timePatternOptions),
  transportMode: z.enum(transportModeOptions),
  targetGroups: z.array(z.enum(targetGroupOptions)).default([]),
  severity: z.number().int().min(1).max(5).default(3),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const statusOptions = ["new", "clustered", "reviewed"] as const;

// POST /api/reports body — the AI analysis the citizen confirmed (and may
// have edited) on the review screen. No raw description, ever.
export const createReportSchema = reportAnalysisSchema;

export type CreateReportInput = z.infer<typeof createReportSchema>;

// A full row as stored in and returned from Supabase `reports`.
export const savedReportSchema = reportAnalysisSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  district: z.string().nullable(),
  cluster_id: z.uuid().nullable(),
  status: z.enum(statusOptions),
});

export type SavedReport = z.infer<typeof savedReportSchema>;
