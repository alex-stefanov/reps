import { and, desc, eq, isNull } from "drizzle-orm";
import { CURATED_IDEAS } from "@/lib/core/ideas";
import { getDb } from "@/lib/db/client";
import { ideas, users, type Idea, type User } from "@/lib/db/schema";

/** Newest first — the pool grows from the top like the sketch's grid. */
export async function getIdeas(userId: string): Promise<Idea[]> {
  const db = await getDb();
  return db
    .select()
    .from(ideas)
    .where(eq(ideas.userId, userId))
    .orderBy(desc(ideas.createdAt));
}

/**
 * First-open curated seeding (spec §9.6), exactly once per user: the
 * seeded-at stamp is claimed *before* inserting, so deleting every idea
 * later leaves the pool honestly empty.
 */
export async function seedIdeasOnce(user: User): Promise<void> {
  if (user.ideasSeededAt) return;
  const db = await getDb();

  const [claimed] = await db
    .update(users)
    .set({ ideasSeededAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.ideasSeededAt)))
    .returning({ id: users.id });
  if (!claimed) return; // another request won the race

  await db.insert(ideas).values(
    CURATED_IDEAS.map((idea) => ({
      userId: user.id,
      name: idea.name,
      type: idea.type,
      description: idea.description,
      hours: idea.hours,
      source: "curated",
    })),
  );
}

export async function getOwnedIdea(
  userId: string,
  ideaId: string,
): Promise<Idea | null> {
  const db = await getDb();
  const row = await db.query.ideas.findFirst({
    where: and(eq(ideas.id, ideaId), eq(ideas.userId, userId)),
  });
  return row ?? null;
}
