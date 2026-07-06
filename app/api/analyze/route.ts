import "server-only";
import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import {
  analyzeRequestSchema,
  reportAnalysisSchema,
  subCategoryOptions,
  timePatternOptions,
  transportModeOptions,
  targetGroupOptions,
  type ReportAnalysis,
} from "@/lib/schema";

const SYSTEM_PROMPT = `당신은 화성시 교통불편 제보를 분석하는 도우미입니다.
시민이 작성한 자유 서술형 텍스트를 받아 아래 규칙에 따라 오직 하나의 JSON 객체만 출력하세요.
코드 블록(\`\`\`)이나 설명 문장을 절대 포함하지 마세요. JSON 객체 하나만 출력합니다.

# 개인정보 마스킹 (가장 중요한 규칙)
masked_text 필드를 만들 때 원문에서 아래 항목을 찾아 자연스러운 중립 표현으로 치환하세요:
- 사람 이름 → "제보자" 또는 문맥에 맞는 표현으로 대체
- 전화번호(휴대폰, 유선 포함 모든 숫자 패턴) → "연락처 비공개"
- 아파트/건물의 동·호수(예: "101동 202호", "3단지 5동") → "OO동 OO호" 형태로 일반화하거나 완전히 생략
- 차량 번호판(예: "12가 3456") → "차량번호 비공개"
원문의 핵심 불편 내용과 위치 정보(도로명, 정류장명, 지역명 등)는 유지하되, 위 개인정보만 제거합니다.
어떤 경우에도 masked_text에 원본 개인정보를 그대로 남기면 안 됩니다.

# 분류 규칙
- category는 항상 "교통" 고정값입니다.
- sub_category는 다음 중 정확히 하나: ${subCategoryOptions.join(", ")}
- time_pattern은 다음 중 정확히 하나: ${timePatternOptions.join(", ")}
- transport_mode는 다음 중 정확히 하나: ${transportModeOptions.join(", ")}
- target_groups는 다음 중 0개 이상 배열: ${targetGroupOptions.join(", ")}
- problem_types는 문제 유형을 나타내는 한국어 짧은 문자열 배열(예: ["배차간격 과다", "혼잡"])
- severity는 1~5 정수 (1=경미, 5=매우 심각)
- summary는 한 문장 요약 (한국어)
- suggested_policies는 후보 정책 제안 문자열 배열 (한국어, 0~3개)

# 출력 JSON 스키마 (키 이름을 정확히 지키세요)
{
  "masked_text": string,
  "category": "교통",
  "sub_category": string,
  "problem_types": string[],
  "location_name": string,
  "time_pattern": string,
  "transport_mode": string,
  "severity": number,
  "target_groups": string[],
  "summary": string,
  "suggested_policies": string[]
}`;

function buildUserPrompt(input: {
  description: string;
  locationName: string;
  timePattern: string;
  transportMode: string;
  targetGroups: string[];
  severity: number;
}) {
  return `# 시민이 입력한 원본 정보
자유 서술: ${input.description}
위치/장소명: ${input.locationName}
자주 발생하는 시간대: ${input.timePattern}
교통수단: ${input.transportMode}
이용자 유형: ${input.targetGroups.length > 0 ? input.targetGroups.join(", ") : "미입력"}
체감 불편도: ${input.severity}

위 정보를 바탕으로 규칙에 따라 JSON 객체 하나만 출력하세요. location_name, time_pattern,
transport_mode, target_groups, severity는 시민이 입력한 값을 우선 반영하되, 자유 서술의
내용과 명백히 다르면 자유 서술을 근거로 보정하세요.`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

async function requestAnalysis(
  input: ReturnType<typeof analyzeRequestSchema.parse>
): Promise<ReportAnalysis> {
  const raw = await callLLM({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  });
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  return reportAnalysisSchema.parse(parsed);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const parsedRequest = analyzeRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsedRequest.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await requestAnalysis(parsedRequest.data);
    return NextResponse.json(result);
  } catch (firstError) {
    // Retry once — the model may have returned malformed JSON or an invalid enum.
    try {
      const result = await requestAnalysis(parsedRequest.data);
      return NextResponse.json(result);
    } catch (secondError) {
      console.error("analyze: LLM call failed twice", firstError, secondError);
      return NextResponse.json(
        {
          error:
            "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.",
        },
        { status: 502 }
      );
    }
  }
}
