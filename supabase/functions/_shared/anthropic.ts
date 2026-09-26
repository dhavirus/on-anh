// Minimal Anthropic Messages API client. Plain fetch, no SDK dependency —
// these functions make one call each, an SDK isn't earning its keep here.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// Haiku: frequent, small-scope calls (grading near-misses, short
// explanations, a handful of practice items) where cost matters more
// than the largest possible model.
export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export interface ClaudeResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callClaude(
  system: string,
  userMessage: string,
  model: string = DEFAULT_MODEL
): Promise<ClaudeResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in Edge Function secrets");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  return {
    text,
    model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

/** Pulls the first {...} or [...] block out of a model response, in case
 * it added any stray prose despite instructions to return JSON only. */
export function extractJson(text: string): unknown {
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error("No JSON found in model response");
  return JSON.parse(match[0]);
}
