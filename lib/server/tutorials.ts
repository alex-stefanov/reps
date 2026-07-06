import { and, asc, eq, isNull } from "drizzle-orm";
import { CURATED_TUTORIALS } from "@/lib/core/tutorials";
import { getDb } from "@/lib/db/client";
import { tutorials, users, type Tutorial, type User } from "@/lib/db/schema";

/** Alphabetical — a library shelf, not a feed. */
export async function getTutorials(userId: string): Promise<Tutorial[]> {
  const db = await getDb();
  return db
    .select()
    .from(tutorials)
    .where(eq(tutorials.userId, userId))
    .orderBy(asc(tutorials.title));
}

/** One-time curated seeding (spec §11.2) — same claim-first contract as Ideas. */
export async function seedTutorialsOnce(user: User): Promise<void> {
  if (user.tutorialsSeededAt) return;
  const db = await getDb();

  const [claimed] = await db
    .update(users)
    .set({ tutorialsSeededAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.tutorialsSeededAt)))
    .returning({ id: users.id });
  if (!claimed) return; // another request won the race

  await db.insert(tutorials).values(
    CURATED_TUTORIALS.map((t) => ({
      userId: user.id,
      title: t.title,
      url: t.url,
      language: t.language,
      topic: t.topic,
    })),
  );
}

export async function getOwnedTutorial(
  userId: string,
  tutorialId: string,
): Promise<Tutorial | null> {
  const db = await getDb();
  const row = await db.query.tutorials.findFirst({
    where: and(eq(tutorials.id, tutorialId), eq(tutorials.userId, userId)),
  });
  return row ?? null;
}
