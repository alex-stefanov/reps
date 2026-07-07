"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTutorialInput } from "@/lib/core/tutorials";
import { getDb } from "@/lib/db/client";
import { tutorials } from "@/lib/db/schema";
import { requireUser } from "./current-user";
import { getOwnedTutorial } from "./tutorials";

export interface TutorialFormInput {
  title: string;
  url: string;
  language: string;
  topic: string;
}

export interface TutorialActionResult {
  error?: string;
}

const INVALID =
  "A tutorial needs a title, a real http(s) link, a language, and a topic.";

export async function addTutorial(
  input: TutorialFormInput,
): Promise<TutorialActionResult> {
  const user = await requireUser();
  const parsed = parseTutorialInput(input);
  if (!parsed) return { error: INVALID };

  const db = await getDb();
  await db.insert(tutorials).values({ userId: user.id, ...parsed });

  revalidatePath("/tutorials");
  redirect("/tutorials");
}

export async function updateTutorial(
  tutorialId: string,
  input: TutorialFormInput,
): Promise<TutorialActionResult> {
  const user = await requireUser();
  const existing = await getOwnedTutorial(user.id, tutorialId);
  if (!existing) return { error: "That tutorial is gone." };
  const parsed = parseTutorialInput(input);
  if (!parsed) return { error: INVALID };

  const db = await getDb();
  await db.update(tutorials).set(parsed).where(eq(tutorials.id, tutorialId));

  revalidatePath("/tutorials");
  return {};
}

export async function deleteTutorial(tutorialId: string): Promise<void> {
  const user = await requireUser();
  const existing = await getOwnedTutorial(user.id, tutorialId);
  if (!existing) return;
  const db = await getDb();
  await db.delete(tutorials).where(eq(tutorials.id, tutorialId));
  revalidatePath("/tutorials");
}
