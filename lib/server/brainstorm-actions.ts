"use server";

import { normalizeReply, normalizeSuggestions } from "@/lib/core/ai";
import { CURATED_IDEAS, type IdeaType } from "@/lib/core/ideas";
import { requireUser } from "./current-user";
import {
  isClaudeConfigured,
  structuredCall,
  type JsonSchema,
} from "./claude";

/**
 * The brainstorm agent (spec §9.2, §9.3 P1): a chat that asks orienting
 * questions, then suggests *valid, buildable* projects — never filler like
 * "a calculator" (spec §9.3, open question §15.5). The guardrail is a
 * constrained system prompt seeded with the curated pool as the quality bar,
 * plus structured output re-validated by lib/core/ai.
 */

export interface BrainstormMessage {
  role: "user" | "assistant";
  text: string;
}

export interface BrainstormSuggestion {
  name: string;
  type: IdeaType;
  description: string | null;
  hours: number | null;
}

export interface BrainstormResult {
  error?: string;
  reply?: string;
  suggestions?: BrainstormSuggestion[];
}

const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "Your conversational reply — either an orienting question to understand their direction, or a lead-in to the suggestions.",
    },
    suggestions: {
      type: "array",
      description:
        "Zero or more concrete, buildable project ideas. Empty while still asking orienting questions. Never filler.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: {
            type: "string",
            enum: ["byox", "saas", "project"],
          },
          description: { type: "string" },
          hours: { type: "integer" },
        },
        required: ["name", "type", "description", "hours"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "suggestions"],
  additionalProperties: false,
};

const EXEMPLARS = CURATED_IDEAS.slice(0, 6)
  .map((i) => `- ${i.name} (${i.type}): ${i.description}`)
  .join("\n");

const SYSTEM =
  "You are a brainstorming partner for an ambitious software engineer building their portfolio. " +
  "Your job: ask a couple of orienting questions to understand the field or direction they want, " +
  "then suggest real, buildable, meaningful projects they could add to their pool. " +
  "Every suggestion must be a genuine engineering project a portfolio would be proud of — " +
  "on the level of these:\n" +
  EXEMPLARS +
  "\nNever suggest filler or toy projects (no 'a calculator', no 'a to-do list'). " +
  "Types: 'byox' = build-your-own-X clones of real systems, 'saas' = a sellable product, " +
  "'project' = a substantial standalone build. Give an honest hours estimate. " +
  "Keep replies short and encouraging. Offer 2–4 suggestions once you understand the direction; " +
  "while still orienting, ask your question and leave suggestions empty.";

const MAX_TURNS = 12;

export async function brainstorm(
  history: BrainstormMessage[],
): Promise<BrainstormResult> {
  await requireUser();

  if (!isClaudeConfigured()) {
    return {
      error:
        "The brainstorm agent needs an ANTHROPIC_API_KEY. Add ideas manually for now.",
    };
  }

  const trimmed = history
    .filter((m) => typeof m.text === "string" && m.text.trim() !== "")
    .slice(-MAX_TURNS);
  if (trimmed.length === 0) {
    return { error: "Say a word about what you'd like to build." };
  }

  // Fold the conversation into a single user turn — the agent is stateless
  // per call and the transcript is short.
  const transcript = trimmed
    .map((m) => `${m.role === "user" ? "Builder" : "You"}: ${m.text}`)
    .join("\n");

  let raw: { reply?: unknown; suggestions?: unknown };
  try {
    raw = await structuredCall({
      system: SYSTEM,
      content: [
        {
          type: "text",
          text:
            `Conversation so far:\n${transcript}\n\n` +
            "Reply to the Builder's latest message. Ask an orienting question if you " +
            "don't yet understand the direction; otherwise suggest 2–4 buildable ideas.",
        },
      ],
      schema: SCHEMA,
      maxTokens: 1536,
    });
  } catch {
    return { error: "The agent is unavailable right now — try again in a moment." };
  }

  const reply = normalizeReply(raw.reply);
  const suggestions = normalizeSuggestions(raw.suggestions);
  if (!reply && suggestions.length === 0) {
    return { error: "The agent didn't have a reply — try rephrasing." };
  }

  return { reply: reply || "Here are a few directions:", suggestions };
}
