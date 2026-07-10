"use server";

import { normalizeReceiptScan } from "@/lib/core/ai";
import { requireUser } from "./current-user";
import { getAvailableCategories } from "./finance";
import {
  isClaudeConfigured,
  structuredCall,
  type ImageMediaType,
  type JsonSchema,
} from "./claude";

/**
 * Receipt scan (spec §7.2, §7.4 P1): a photo in, an editable {amount, semantic
 * category} suggestion out. The semantic mapping (ice cream → Food, spec §7.3)
 * is the hard part CLAUDE.md flags — so the prompt is handed the user's actual
 * spending categories and told to map to one of them, or name a new one.
 * Never logs the amount (CLAUDE.md: financial data is sensitive).
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MEDIA: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp"];

export interface ReceiptScanResult {
  error?: string;
  amountCents?: number;
  /** Matched existing category id, if the semantic category already exists. */
  categoryId?: string | null;
  /** The category name to prefill (existing or newly suggested). */
  categoryName?: string;
  merchant?: string | null;
}

const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    amountCents: {
      type: "integer",
      description: "The receipt TOTAL in euro cents (e.g. €12.99 → 1299).",
    },
    categoryName: {
      type: "string",
      description:
        "A semantic spending category for what was bought — e.g. an ice-cream receipt is 'Food', a taxi is 'Transportation'. Prefer one of the user's existing categories; only invent a new one if none fit.",
    },
    merchant: {
      type: "string",
      description: "The merchant name if visible, else empty string.",
    },
  },
  required: ["amountCents", "categoryName", "merchant"],
  additionalProperties: false,
};

export async function scanReceipt(input: {
  imageBase64: string;
  mediaType: string;
}): Promise<ReceiptScanResult> {
  const user = await requireUser();

  if (!isClaudeConfigured()) {
    return { error: "Receipt scan needs an ANTHROPIC_API_KEY. Enter it manually for now." };
  }
  if (!ALLOWED_MEDIA.includes(input.mediaType as ImageMediaType)) {
    return { error: "That image format isn't supported — try a JPEG or PNG." };
  }
  const mediaType = input.mediaType as ImageMediaType;
  // base64 encodes 3 bytes per 4 chars; decode to real bytes so the gate
  // matches the "under 5 MB" copy rather than allowing ~5.5 MB through.
  if (input.imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return { error: "That image is too large — under 5 MB, please." };
  }

  const categories = (await getAvailableCategories(user.id)).filter(
    (c) => c.kind === "spending",
  );
  const categoryList = categories.map((c) => c.name).join(", ");

  let raw: unknown;
  try {
    raw = await structuredCall({
      system:
        "You read a photo of a receipt and extract its total and a spending category. " +
        "Categorize semantically by what was purchased, not literally: a receipt for " +
        "ice cream is 'Food', a bus ticket is 'Transportation'. " +
        `The user's existing spending categories are: ${categoryList}. ` +
        "Map to one of those when it fits; only propose a new category name when none do.",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: input.imageBase64,
          },
        },
        {
          type: "text",
          text: "Extract the receipt total (in euro cents) and its semantic spending category.",
        },
      ],
      schema: SCHEMA,
      maxTokens: 512,
    });
  } catch {
    return { error: "Couldn't read that receipt — enter it manually." };
  }

  const scan = normalizeReceiptScan(raw);
  if (!scan) return { error: "Couldn't read a total off that receipt — enter it manually." };

  // Match the semantic category to an existing one (case-insensitive).
  const match = categories.find(
    (c) => c.name.toLowerCase() === scan.categoryName.toLowerCase(),
  );

  return {
    amountCents: scan.amountCents,
    categoryId: match?.id ?? null,
    categoryName: match?.name ?? scan.categoryName,
    merchant: scan.merchant,
  };
}
