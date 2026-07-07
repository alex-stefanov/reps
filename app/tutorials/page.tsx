import Link from "next/link";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { TutorialsScreen } from "@/components/tutorials-screen";
import { requireUser } from "@/lib/server/current-user";
import { getTutorials, seedTutorialsOnce } from "@/lib/server/tutorials";

/** The Tutorials library (spec §11): how to learn, curated and filterable. */
export default async function TutorialsPage() {
  const user = await requireUser();
  await seedTutorialsOnce(user);
  const tutorials = await getTutorials(user.id);

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
            Tutorials
          </h1>
          <p className="mt-1 text-xs font-semibold text-sub">
            The shelf that teaches the plan
          </p>
        </div>
        <Link
          href="/tutorials/add"
          aria-label="Add tutorial"
          data-testid="tutorials-add"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-accent text-white transition-transform hover:bg-accent-deep active:scale-95"
        >
          <PlusIcon className="size-4.5" />
        </Link>
      </div>

      <TutorialsScreen
        tutorials={tutorials.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          language: t.language,
          topic: t.topic,
        }))}
      />
    </main>
  );
}
