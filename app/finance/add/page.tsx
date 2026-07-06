import Link from "next/link";
import { AddFinanceForm } from "@/components/add-finance-form";
import { ChevronLeftIcon } from "@/components/icons";
import { todayISO } from "@/lib/core/dates";
import { requireUser } from "@/lib/server/current-user";
import {
  ensureDefaultCategories,
  getAvailableCategories,
} from "@/lib/server/finance";

export default async function AddFinancePage() {
  const user = await requireUser();
  await ensureDefaultCategories();
  const categories = await getAvailableCategories(user.id);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/finance"
          aria-label="Back to Finance"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-card text-sub hover:text-text active:scale-95"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-text">
          Add
        </h1>
      </div>

      <AddFinanceForm
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          isDefault: c.userId === null,
        }))}
        today={todayISO(user.timezone)}
      />
    </main>
  );
}
