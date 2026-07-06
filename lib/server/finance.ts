import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  financeEntries,
  type Category,
  type CategoryKind,
  type FinanceEntry,
  type User,
} from "@/lib/db/schema";

/**
 * Finance data assembly (spec §7). Amounts stay integer cents end to end and
 * are never logged — CLAUDE.md treats FinanceEntry as real personal financial
 * data from day one.
 */

/** Seeded defaults (spec §7.3) — global rows with user_id null. */
const DEFAULT_CATEGORIES: Record<CategoryKind, string[]> = {
  spending: ["Food", "Housing", "Transportation", "Health", "Savings"],
  income: ["Salary", "Freelance", "Other"],
};

/** Inserts any missing seeded defaults. Idempotent, cheap, runs on hub open. */
export async function ensureDefaultCategories(): Promise<void> {
  const db = await getDb();
  const existing = await db
    .select({ name: categories.name, kind: categories.kind })
    .from(categories)
    .where(isNull(categories.userId));
  const have = new Set(existing.map((c) => `${c.kind}:${c.name}`));

  const missing = (Object.keys(DEFAULT_CATEGORIES) as CategoryKind[]).flatMap(
    (kind) =>
      DEFAULT_CATEGORIES[kind]
        .filter((name) => !have.has(`${kind}:${name}`))
        .map((name) => ({ name, kind, userId: null })),
  );
  if (missing.length > 0) {
    await db.insert(categories).values(missing);
  }
}

/** Seeded defaults + this user's own categories, defaults first, then A–Z. */
export async function getAvailableCategories(
  userId: string,
): Promise<Category[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)));
  return rows.sort(
    (a, b) =>
      Number(a.userId !== null) - Number(b.userId !== null) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Resolves a category for a new entry: an existing available one by id, or
 * — the "insert a new one" dropdown path (spec §7.2) — by name, reusing a
 * case-insensitive match before creating.
 */
export async function resolveCategory(
  user: User,
  kind: CategoryKind,
  categoryId: string | null,
  newName: string | null,
): Promise<Category | null> {
  const available = await getAvailableCategories(user.id);

  if (categoryId) {
    return available.find((c) => c.id === categoryId && c.kind === kind) ?? null;
  }

  const name = newName?.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) return null;
  const existing = available.find(
    (c) => c.kind === kind && c.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return existing;

  const db = await getDb();
  const [created] = await db
    .insert(categories)
    .values({ userId: user.id, name, kind })
    .returning();
  return created;
}

/** Every entry the user has, newest first — personal-finance scale, one query. */
export async function getFinanceEntries(userId: string): Promise<FinanceEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(financeEntries)
    .where(eq(financeEntries.userId, userId))
    .orderBy(desc(financeEntries.occurredOn), desc(financeEntries.createdAt));
}

export async function getOwnedEntry(
  userId: string,
  entryId: string,
): Promise<FinanceEntry | null> {
  const db = await getDb();
  const row = await db.query.financeEntries.findFirst({
    where: and(
      eq(financeEntries.id, entryId),
      eq(financeEntries.userId, userId),
    ),
  });
  return row ?? null;
}
