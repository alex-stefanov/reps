import Link from "next/link";
import { redirect } from "next/navigation";
import { CharacterScene } from "@/components/character-scene";
import { CompletionRing } from "@/components/completion-ring";
import {
  CalendarIcon,
  ChevronRightIcon,
  GearIcon,
  PersonIcon,
} from "@/components/icons";
import { MonthGrid } from "@/components/month-grid";
import { HubRow } from "@/components/hub-row";
import { TaskList } from "@/components/task-list";
import { requireUser } from "@/lib/server/current-user";
import { getHomeView } from "@/lib/server/home-view";

function friendlyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export default async function HomePage() {
  const user = await requireUser();
  const view = await getHomeView(user);
  if (!view) redirect("/onboarding");

  const gymTask = view.tasks.find(
    (t) => t.kind === "standing" && t.track === "gym",
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-6">
      {/* iOS large-title header */}
      <header className="flex items-start justify-between px-1">
        <div>
          <h1 className="text-[2rem] font-extrabold leading-none tracking-tight text-text">
            Day <span data-testid="day-number">{view.dayNumber}</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-sub">
            {friendlyDate(view.today)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/customize"
            aria-label="Customize character"
            className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub transition-colors hover:text-text active:scale-95"
          >
            <PersonIcon className="size-4.5" />
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub transition-colors hover:text-text active:scale-95"
          >
            <GearIcon className="size-4.5" />
          </Link>
        </div>
      </header>

      {/* 3D hero */}
      <div className="mt-5">
        <CharacterScene
          week={view.week}
          todayIndex={view.todayIndex}
          doneCount={view.doneCount}
          totalCount={view.totalCount}
          streak={view.streak.current}
          justLost={view.streak.justLost}
        />
      </div>

      {/* Ring + today summary */}
      <a
        href="#tasks"
        className="card-shadow mt-4 flex items-center gap-4 rounded-3xl bg-card px-5 py-4 transition-transform active:scale-[0.99]"
        aria-label="Jump to today's tasks"
      >
        <CompletionRing done={view.doneCount} total={view.totalCount} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-text">
            {view.doneCount >= view.totalCount && view.totalCount > 0
              ? "Day complete. Ring closed."
              : `${view.totalCount - view.doneCount} to go today`}
          </span>
          <span className="mt-0.5 block text-sm text-sub">
            Close the ring, keep the path lit.
          </span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-mute" />
      </a>

      {/* Today's tasks */}
      <section id="tasks" className="mt-7 scroll-mt-4">
        <h2 className="px-2 text-lg font-extrabold tracking-tight text-text">
          Today
        </h2>
        <div className="mt-3">
          <TaskList tasks={view.tasks} verification={view.verification} />
        </div>
      </section>

      {/* Hubs */}
      <section className="mt-8">
        <HubRow gymTask={gymTask} />
      </section>

      {/* This month */}
      <section className="mt-8">
        <MonthGrid
          label={view.monthLabel}
          leading={view.monthLeading}
          cells={view.monthCells}
        />
      </section>

      {/* Plan */}
      <Link
        href="/schedule"
        className="card-shadow mt-6 flex items-center gap-4 rounded-3xl bg-card px-5 py-4 transition-transform active:scale-[0.99]"
      >
        <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep">
          <CalendarIcon className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-bold text-text">Plan</span>
          <span className="block text-sm text-sub">
            The whole program, week by week
          </span>
        </span>
        <ChevronRightIcon className="size-4 text-mute" />
      </Link>
    </main>
  );
}
