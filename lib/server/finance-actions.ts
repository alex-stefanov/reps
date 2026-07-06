"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayISO } from "@/lib/core/dates";
import { parseEuros } from "@/lib/core/finance";
import { getDb } from "@/lib/db/client";
import { financeEntries, type FinanceDirection } from "@/lib/db/schema";
import { requireUser } from "./current-user";
import { getOwnedEntry, resolveCategory } from "./finance";

/** €1,000,000 per entry — a sanity ceiling, not a product limit. */
const MAX_ENTRY_CENTS = 100_000_000;

export interface AddFinanceEntryInput {
  direction: FinanceDirection;
  /** As typed — "12,50" is fine; parsed server-side into cents. */
  amount: string;
  /** Existing category id, or null with `newCategoryName` set (spec §7.2). */
  categoryId: string | null;
  newCategoryName: string | null;
  /** ISO date; defaults to today in the user's timezone. */
  occurredOn: string | null;
}

export interface AddFinanceEntryResult {
  error?: string;
}

export async function addFinanceEntry(
  input: AddFinanceEntryInput,
): Promise<AddFinanceEntryResult> {
  const user = await requireUser();

  const direction: FinanceDirection =
    input.direction === "income" ? "income" : "spending";

  const amountCents = parseEuros(input.amount);
  if (amountCents === null) return { error: "Enter a real amount." };
  if (amountCents > MAX_ENTRY_CENTS) return { error: "That's above the €1M single-entry cap." };

  const today = todayISO(user.timezone);
  let occurredOn = input.occurredOn ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) occurredOn = today;
  // Money is recorded, not planned — no future entries (charts stay honest).
  if (occurredOn > today) return { error: "No future entries — log it when it happens." };

  const category = await resolveCategory(
    user,
    direction,
    input.categoryId,
    input.newCategoryName,
  );
  if (!category) return { error: "Pick a type or name a new one." };

  const db = await getDb();
  await db.insert(financeEntries).values({
    userId: user.id,
    direction,
    amountCents,
    categoryId: category.id,
    occurredOn,
  });

  revalidatePath("/finance");
  redirect("/finance");
}

/** Undo for fat-fingered entries; charts recompute on revalidate. */
export async function deleteFinanceEntry(entryId: string): Promise<void> {
  const user = await requireUser();
  const entry = await getOwnedEntry(user.id, entryId);
  if (!entry) return;
  const db = await getDb();
  await db.delete(financeEntries).where(eq(financeEntries.id, entryId));
  revalidatePath("/finance");
}
