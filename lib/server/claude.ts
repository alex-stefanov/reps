/**
 * The one place that talks to the Claude API (spec §16 Phase 3 assists).
 * Everything above this file treats AI as optional: when ANTHROPIC_API_KEY is
 * unset the features degrade gracefully (like the DB and auth fallbacks), so
 * tests and dogfooding run without a key or a bill.
 *
 * Model is a single constant: Opus 4.8 is the SDK's mandated default; change
 * this one line to trade capability for cost (e.g. claude-haiku-4-5).
 */
export const CLAUDE_MODEL = "claude-opus-4-8";

/**
 * Per-request wall-clock cap (SDK timeout is in ms). A stalled completion must
 * surface promptly as the caller's "unavailable" error rather than riding the
 * SDK's 10-minute default under a spinner.
 */
const CLAUDE_TIMEOUT_MS = 30_000;

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Lazily constructed so the SDK is never loaded when AI is off. */
export async function getClaude() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  // Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, which the e2e mock sets)
  // from the environment.
  return new Anthropic();
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
  [key: string]: unknown;
}

/** The base64 image types Claude's vision accepts (no HEIC). */
export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

/**
 * One structured-output call: the model is constrained to `schema` and the
 * validated JSON is returned. Callers still re-check every field (lib/core/ai)
 * — the schema shapes the output, our normalizers decide if it's usable.
 */
export async function structuredCall<T = unknown>(opts: {
  system: string;
  content: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: ImageMediaType; data: string };
      }
  >;
  schema: JsonSchema;
  maxTokens: number;
  /**
   * Enable adaptive thinking for quality-sensitive calls (e.g. the brainstorm
   * agent). Omitted → thinking off (Opus 4.8 default), right for extraction.
   * Counts toward maxTokens, so callers that set this give it headroom.
   */
  thinking?: boolean;
}): Promise<T> {
  const client = await getClaude();
  const message = await client.messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      ...(opts.thinking ? { thinking: { type: "adaptive" as const } } : {}),
      output_config: { format: { type: "json_schema", schema: opts.schema } },
      messages: [{ role: "user", content: opts.content }],
    },
    { timeout: CLAUDE_TIMEOUT_MS },
  );

  // A refusal (or any non-text stop) yields no JSON — surface it as such.
  if (message.stop_reason === "refusal") {
    throw new Error("refused");
  }
  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no content");
  return JSON.parse(text.text) as T;
}
