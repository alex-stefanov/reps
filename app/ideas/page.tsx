import Link from "next/link";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { IdeasScreen } from "@/components/ideas-screen";
import { diffDaysISO, todayISO } from "@/lib/core/dates";
import { parseIdeaType } from "@/lib/core/ideas";
import { requireUser } from "@/lib/server/current-user";
import { getIdeas, seedIdeasOnce } from "@/lib/server/ideas";
import { getActiveProgram } from "@/lib/server/program";

/** The Ideas Pool (spec §9): what to build, filterable, schedulable. */
export default async function IdeasPage() {
  const user = await requireUser();
  await seedIdeasOnce(user);
  const [ideas, program] = await Promise.all([
    getIdeas(user.id),
    getActiveProgram(user.id),
  ]);

  const plan = program
    ? {
        weeks: program.weeks,
        currentWeekIndex: Math.min(
          Math.max(
            Math.floor(
              diffDaysISO(program.startDate, todayISO(user.timezone)) / 7,
            ),
            0,
          ),
          program.weeks - 1,
        ),
      }
    : null;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to Home"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-text">
            Ideas
          </h1>
          <p className="mt-1 text-xs font-semibold text-sub">
            What to build next — pick one, plan it
          </p>
        </div>
        <Link
          href="/ideas/add"
          aria-label="Add idea"
          data-testid="ideas-add"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-accent text-white transition-transform hover:bg-accent-deep active:scale-95"
        >
          <PlusIcon className="size-4.5" />
        </Link>
      </div>

      <IdeasScreen
        ideas={ideas.map((i) => ({
          id: i.id,
          name: i.name,
          type: parseIdeaType(i.type) ?? "project",
          description: i.description,
          hours: i.hours,
          source: i.source,
        }))}
        plan={plan}
      />
    </main>
  );
}
