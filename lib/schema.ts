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
