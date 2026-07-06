import Link from "next/link";
import { AddIdeaForm } from "@/components/add-idea-form";
import { ChevronLeftIcon } from "@/components/icons";
import { requireUser } from "@/lib/server/current-user";

export default async function AddIdeaPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/ideas"
          aria-label="Back to Ideas"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-text">
          Add idea
        </h1>
      </div>

      <AddIdeaForm />
    </main>
  );
}
