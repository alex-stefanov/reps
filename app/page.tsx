import Link from "next/link";
import { redirect } from "next/navigation";
import { CharacterScene } from "@/components/character-scene";
import {
  BookIcon,
  BulbIcon,
  CalendarIcon,
  CoinIcon,
  GearIcon,
  PersonIcon,
} from "@/components/icons";
import { MonthGrid } from "@/components/month-grid";
import { RailGym } from "@/components/rail-gym";
import { TaskBlobs } from "@/components/task-blobs";
import { requireUser } from "@/lib/server/current-user";
import { getHomeView } from "@/lib/server/home-view";

export default async function HomePage() {
  const user = await requireUser();
  const view = await getHomeView(user);
  if (!view) redirect("/onboarding");

  const gymTask = view.tasks.find(
    (t) => t.kind === "standing" && t.track === "gym",
  );

  const railLink = (
    href: string,
    icon: React.ReactNode,
    label: string,
  ) => (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center border border-line bg-panel text-dim transition-colors hover:border-line-bright hover:text-fg active:translate-y-px"
    >
      {icon}
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-14 pt-5">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <Link
          href="/customize"
          aria-label="Customize character"
          className="border border-line p-2 text-dim transition-colors hover:border-line-bright hover:text-fg"
        >
          <PersonIcon className="size-4" />
        </Link>
        <h1 className="font-pixel text-xl tracking-widest text-phos">
          DAY <span data-testid="day-number">{view.dayNumber}</span>
        </h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="border border-line p-2 text-dim transition-colors hover:border-line-bright hover:text-fg"
        >
          <GearIcon className="size-4" />
        </Link>
      </header>

      {/* Completion counter */}
      <div className="mt-5 flex items-end justify-between">
        <a href="#tasks" className="group" aria-label="Jump to today's tasks">
          <span className="num text-5xl leading-none text-fg group-hover:text-phos-bright">
            <span data-testid="done-count" className="text-phos-bright">
              {view.doneCount}
            </span>
            <span className="text-faint">/</span>
            {view.totalCount}
          </span>
          <span className="mt-1 block text-xs text-dim">
            today&apos;s tasks · tap to check
          </span>
        </a>
        <p className="num pb-1 text-right text-[11px] leading-tight text-faint">
          {view.today}
          <span className="block">{user.githubHandle}</span>
        </p>
      </div>

      {/* Character on the week terrain + icon rail */}
      <div className="mt-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <CharacterScene
            week={view.week}
            todayIndex={view.todayIndex}
            doneCount={view.doneCount}
            totalCount={view.totalCount}
            streak={view.streak.current}
            justLost={view.streak.justLost}
          />
        </div>
        <nav aria-label="Hubs" className="flex flex-col gap-2">
          {railLink("/finance", <CoinIcon className="size-4" />, "Finance")}
          {gymTask && <RailGym task={gymTask} />}
          {railLink("/ideas", <BulbIcon className="size-4" />, "Ideas pool")}
          {railLink("/tutorials", <BookIcon className="size-4" />, "Tutorials")}
        </nav>
      </div>

      {/* Today's task blobs */}
      <section id="tasks" className="mt-6 scroll-mt-4">
        <h2 className="font-pixel text-[11px] tracking-wider text-dim">
          TODAY
        </h2>
        <div className="mt-2">
          <TaskBlobs tasks={view.tasks} verification={view.verification} />
        </div>
      </section>

      {/* This month */}
      <div className="mt-8">
        <MonthGrid
          label={view.monthLabel}
          leading={view.monthLeading}
          cells={view.monthCells}
        />
      </div>

      {/* Plan */}
      <Link
        href="/schedule"
        className="mt-8 flex items-center gap-3 border border-line-bright bg-raised px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-phos-dim hover:text-phos-bright active:translate-y-px"
      >
        <CalendarIcon className="size-4" />
        Plan
        <span className="ml-auto text-xs text-faint">
          the whole program ›
        </span>
      </Link>
    </main>
  );
}
