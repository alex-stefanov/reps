import { and, desc, eq } from "drizzle-orm";
import { todayISO } from "@/lib/core/dates";
import { generateSchedule } from "@/lib/core/schedule";
import { getDb } from "@/lib/db/client";
import {
  programs,
  scheduleDays,
  scheduleTasks,
  users,
  type Intensity,
  type Program,
  type User,
} from "@/lib/db/schema";

export async function getActiveProgram(
  userId: string,
): Promise<Program | undefined> {
  const db = await getDb();
  return db.query.programs.findFirst({
    where: and(eq(programs.userId, userId), eq(programs.active, true)),
    orderBy: [desc(programs.createdAt)],
  });
}

export interface CreateProgramInput {
  hoursPerWeek: number;
  intensity: Intensity;
  timezone: string;
  leetcodeOn: boolean;
  gymOn: boolean;
  dailyCommitOn: boolean;
}

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) {
    yield items.slice(i, i + size);
  }
}

/**
 * Onboarding and regeneration share this path (spec §8.2): persist the
 * user's answers, retire any active program (non-destructively — history
 * stays), and write a freshly generated plan starting today.
 */
export async function createProgram(
  user: User,
  input: CreateProgramInput,
): Promise<Program> {
  const db = await getDb();

  await db
    .update(users)
    .set({
      timezone: input.timezone,
      leetcodeOn: input.leetcodeOn,
      gymOn: input.gymOn,
      dailyCommitOn: input.dailyCommitOn,
    })
    .where(eq(users.id, user.id));

  await db
    .update(programs)
    .set({ active: false })
    .where(and(eq(programs.userId, user.id), eq(programs.active, true)));

  const startDate = todayISO(input.timezone);
  const generated = generateSchedule({
    hoursPerWeek: input.hoursPerWeek,
    intensity: input.intensity,
    startDate,
    leetcodeOn: input.leetcodeOn,
  });
  const weeks = Math.max(...generated.map((d) => d.weekIndex)) + 1;

  const [program] = await db
    .insert(programs)
    .values({
      userId: user.id,
      hoursPerWeek: input.hoursPerWeek,
      intensity: input.intensity,
      startDate,
      weeks,
    })
    .returning();

  for (const dayChunk of chunks(generated, 28)) {
    const dayRows = await db
      .insert(scheduleDays)
      .values(
        dayChunk.map((d) => ({
          programId: program.id,
          date: d.date,
          weekIndex: d.weekIndex,
          note: d.note,
        })),
      )
      .returning({ id: scheduleDays.id, date: scheduleDays.date });
    const idByDate = new Map(dayRows.map((r) => [r.date, r.id]));

    const taskRows = dayChunk.flatMap((d) =>
      d.tasks.map((t) => ({
        scheduleDayId: idByDate.get(d.date)!,
        track: t.track,
        label: t.label,
        hours: t.hours,
      })),
    );
    if (taskRows.length > 0) {
      await db.insert(scheduleTasks).values(taskRows);
    }
  }

  return program;
}
