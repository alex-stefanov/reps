import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { syncCommitVerification } from "@/lib/server/sync";

/**
 * Periodic verification backstop (spec §13 "app open + periodic").
 * Vercel Cron hits this every 30 minutes so the Commit task can check
 * itself off even while the app is closed. Protected by CRON_SECRET.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = await getDb();
  const candidates = await db
    .select()
    .from(users)
    .where(eq(users.dailyCommitOn, true));

  const outcomes: Record<string, number> = {};
  for (const user of candidates) {
    const outcome = await syncCommitVerification(user, { force: true });
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
  }

  return Response.json({ users: candidates.length, outcomes });
}
