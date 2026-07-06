"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseIdeaInput } from "@/lib/core/ideas";
import { getDb } from "@/lib/db/client";
import { ideas, scheduleDays, scheduleTasks } from "@/lib/db/schema";
import { requireUser } from "./current-user";
import { getOwnedIdea } from "./ideas";
import { getActiveProgram } from "./program";

export interface IdeaFormInput {
  name: string;
  type: string;
  description: string;
  hours: string;
}

export interface IdeaActionResult {
  error?: string;
}

export async function addIdea(
  input: IdeaFormInput,
): Promise<IdeaActionResult> {
  const user = await requireUser();
  const parsed = parseIdeaInput(input);
  if (!parsed) return { error: "An idea needs a real name and a type." };

  const db = await getDb();
  await db.insert(ideas).values({
    userId: user.id,
    name: parsed.name,
    type: parsed.type,
    description: parsed.description,
    hours: parsed.hours,
    source: "manual",
  });

  revalidatePath("/ideas");
  redirect("/ideas");
}

export async function updateIdea(
  ideaId: string,
  input: IdeaFormInput,
): Promise<IdeaActionResult> {
  const user = await requireUser();
  const idea = await getOwnedIdea(user.id, ideaId);
  if (!idea) return { error: "That idea is gone." };
  const parsed = parseIdeaInput(input);
  if (!parsed) return { error: "An idea needs a real name and a type." };

  const db = await getDb();
  await db
    .update(ideas)
    .set({
      name: parsed.name,
      type: parsed.type,
      description: parsed.description,
      hours: parsed.hours,
    })
    .where(eq(ideas.id, ideaId));

  // A placed idea's name labels its Project Work sessions — keep them true.
  await db
    .update(scheduleTasks)
    .set({ label: parsed.name })
    .where(eq(scheduleTasks.ideaId, ideaId));

  revalidatePath("/ideas");
  revalidatePath("/schedule");
  revalidatePath("/");
  return {};
}

export async function deleteIdea(ideaId: string): Promise<void> {
  const user = await requireUser();
  const idea = await getOwnedIdea(user.id, ideaId);
  if (!idea) return;
  const db = await getDb();
  // idea_id is ON DELETE SET NULL; restore the generic label so the
  // schedule doesn't keep naming a deleted idea.
  await db
    .update(scheduleTasks)
    .set({ label: "Project work" })
    .where(eq(scheduleTasks.ideaId, ideaId));
  await db.delete(ideas).where(eq(ideas.id, ideaId));
  revalidatePath("/ideas");
  revalidatePath("/schedule");
  revalidatePath("/");
}

export interface PlaceIdeaResult {
  error?: string;
  /** Project Work sessions the idea now occupies. */
  placed?: number;
}

/**
 * The pool → plan connection (spec §8.2/§9.4): an idea becomes the Project
 * Work for a stretch of weeks. Every project-track session in the stretch
 * gets the idea's id and name; placing a different idea over the same weeks
 * simply takes them over.
 */
export async function placeIdeaIntoSchedule(
  ideaId: string,
  startWeekIndex: number,
  weekCount: number,
): Promise<PlaceIdeaResult> {
  const user = await requireUser();
  const idea = await getOwnedIdea(user.id, ideaId);
  if (!idea) return { error: "That idea is gone." };
  const program = await getActiveProgram(user.id);
  if (!program) return { error: "No active program to place into." };

  const start = Math.max(0, Math.floor(startWeekIndex));
  const count = Math.min(Math.max(1, Math.floor(weekCount)), program.weeks - start);
  if (start >= program.weeks) return { error: "That week is past the program." };

  const db = await getDb();
  const days = await db
    .select({ id: scheduleDays.id })
    .from(scheduleDays)
    .where(
      and(
        eq(scheduleDays.programId, program.id),
        gte(scheduleDays.weekIndex, start),
        lt(scheduleDays.weekIndex, start + count),
      ),
    );
  if (days.length === 0) return { error: "No days in that stretch." };

  const updated = await db
    .update(scheduleTasks)
    .set({ ideaId: idea.id, label: idea.name })
    .where(
      and(
        inArray(
          scheduleTasks.scheduleDayId,
          days.map((d) => d.id),
        ),
        eq(scheduleTasks.track, "project"),
      ),
    )
    .returning({ id: scheduleTasks.id });

  if (updated.length === 0) {
    return { error: "No Project Work sessions in that stretch." };
  }

  revalidatePath("/ideas");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { placed: updated.length };
}
