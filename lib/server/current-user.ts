import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";

/**
 * Resolves the session to a database User row, creating it on first sign-in.
 * Timezone starts as UTC and is corrected from the browser during onboarding.
 */
export async function currentUser(): Promise<User | null> {
  const session = await auth();
  const githubId = session?.user?.githubId;
  if (!githubId) return null;

  const db = await getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.githubId, githubId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      githubId,
      githubHandle: session.user.githubHandle,
      name: session.user.name ?? null,
      avatarUrl: session.user.avatarUrl,
    })
    .onConflictDoNothing({ target: users.githubId })
    .returning();

  return (
    created ??
    (await db.query.users.findFirst({ where: eq(users.githubId, githubId) })) ??
    null
  );
}

/** Page guard: unauthenticated → /signin. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return user;
}
