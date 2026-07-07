"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AMBIANCES, parseCosmetics } from "@/lib/core/cosmetics";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireUser } from "./current-user";

/**
 * Persist a cosmetic choice (spec §10). Merges into the existing jsonb so
 * future fields survive; an unknown ambiance is ignored rather than stored.
 */
export async function setAmbiance(ambianceId: string): Promise<void> {
  const user = await requireUser();
  if (!AMBIANCES.some((a) => a.id === ambianceId)) return;

  const current = parseCosmetics(user.cosmetics);
  const next = { ...current, ambiance: ambianceId };

  const db = await getDb();
  await db.update(users).set({ cosmetics: next }).where(eq(users.id, user.id));

  revalidatePath("/");
  revalidatePath("/customize");
}
