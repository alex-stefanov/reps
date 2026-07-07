import { parseIdeaInput, type IdeaInput } from "./ideas";

/**
 * Validation for model output (spec §7.4 receipt scan, §9.3 brainstorm). The
 * model is constrained by a JSON schema, but never trust it blindly — every
 * field is re-validated here with the same rules as manual entry, so a
 * hallucinated amount or a filler idea can't slip through. Pure: no SDK, no
 * network, so it's unit-testable without a key.
 */

export interface ReceiptScan {
  amountCents: number;
  /** Semantic category (spec §7.3: ice cream → Food), matched or created server-side. */
  categoryName: string;
  merchant: string | null;
}

/** €1,000,000 ceiling, matching the manual-entry cap. */
const MAX_ENTRY_CENTS = 100_000_000;

export function normalizeReceiptScan(raw: unknown): ReceiptScan | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const cents = Math.round(Number(obj.amountCents));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_ENTRY_CENTS) {
    return null;
  }

  const categoryName =
    typeof obj.categoryName === "string"
      ? obj.categoryName.trim().replace(/\s+/g, " ").slice(0, 40)
      : "";
  if (categoryName.length < 2) return null;

  const merchant =
    typeof obj.merchant === "string" && obj.merchant.trim() !== ""
      ? obj.merchant.trim().slice(0, 80)
      : null;

  return { amountCents: cents, categoryName, merchant };
}

/**
 * Filters model-suggested ideas to real, buildable ones (spec §9.3: valid and
 * meaningful, never filler). Each must survive the same validation as a
 * hand-typed idea; anything malformed is dropped rather than shown.
 */
export function normalizeSuggestions(raw: unknown): IdeaInput[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: IdeaInput[] = [];
  for (const item of raw) {
    const parsed = parseIdeaInput({
      name: (item as Record<string, unknown>)?.name,
      type: (item as Record<string, unknown>)?.type,
      description: (item as Record<string, unknown>)?.description,
      hours: (item as Record<string, unknown>)?.hours,
    });
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out.slice(0, 6);
}

/** Clamps a brainstorm reply to a sane length for a chat bubble. */
export function normalizeReply(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 1200) : "";
}
