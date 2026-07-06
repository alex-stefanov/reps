import Link from "next/link";
import { AddTutorialForm } from "@/components/add-tutorial-form";
import { ChevronLeftIcon } from "@/components/icons";
import { distinctTags } from "@/lib/core/tutorials";
import { requireUser } from "@/lib/server/current-user";
import { getTutorials } from "@/lib/server/tutorials";

export default async function AddTutorialPage() {
  const user = await requireUser();
  const tutorials = await getTutorials(user.id);
  const tags = distinctTags(tutorials);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/tutorials"
          aria-label="Back to Tutorials"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-text">
          Add tutorial
        </h1>
      </div>

      <AddTutorialForm languages={tags.languages} topics={tags.topics} />
    </main>
  );
}
