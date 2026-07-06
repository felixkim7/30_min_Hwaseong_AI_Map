import "server-only";
import OpenAI from "openai";

const provider = process.env.LLM_PROVIDER ?? "openai";

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Check .env.local.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Calls the configured LLM provider with a system + user prompt and returns
 * the raw text response. Callers are responsible for parsing/validating the
 * result (see app/api/analyze/route.ts). Server-only.
 *
 * `jsonMode` (default true) requests strict JSON output. OpenAI requires the
 * literal word "json" to appear somewhere in the prompt when this is on —
 * set it to false for free-form output (e.g. markdown reports).
 */
export async function callLLM(params: {
  system: string;
  user: string;
  jsonMode?: boolean;
}): Promise<string> {
  const jsonMode = params.jsonMode ?? true;

  switch (provider) {
    case "openai": {
      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from LLM provider.");
      }
      return content;
    }
    case "anthropic":
      throw new Error(
        "LLM_PROVIDER=anthropic is not implemented yet. Set LLM_PROVIDER=openai or implement the anthropic branch in lib/llm.ts."
      );
    case "gemini":
      throw new Error(
        "LLM_PROVIDER=gemini is not implemented yet. Set LLM_PROVIDER=openai or implement the gemini branch in lib/llm.ts."
      );
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}
