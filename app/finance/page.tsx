import Link from "next/link";
import { FinanceScreen } from "@/components/finance-screen";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { todayISO } from "@/lib/core/dates";
import { requireUser } from "@/lib/server/current-user";
import {
  ensureDefaultCategories,
  getAvailableCategories,
  getFinanceEntries,
} from "@/lib/server/finance";

/** The Finance hub (spec §7): money as a growth readout, not budget guilt. */
export default async function FinancePage() {
  const user = await requireUser();
  await ensureDefaultCategories();
  const [categories, entries] = await Promise.all([
    getAvailableCategories(user.id),
    getFinanceEntries(user.id),
  ]);

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
            Finance
          </h1>
          <p className="mt-1 text-xs font-semibold text-sub">
            Is the line going up?
          </p>
        </div>
        <Link
          href="/finance/add"
          aria-label="Add entry"
          data-testid="finance-add"
          className="card-shadow flex size-10 items-center justify-center rounded-full bg-accent text-white transition-transform hover:bg-accent-deep active:scale-95"
        >
          <PlusIcon className="size-4.5" />
        </Link>
      </div>

      <FinanceScreen
        today={todayISO(user.timezone)}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          isDefault: c.userId === null,
        }))}
        entries={entries.map((e) => ({
          id: e.id,
          direction: e.direction,
          amountCents: e.amountCents,
          categoryId: e.categoryId,
          occurredOn: e.occurredOn,
        }))}
      />
    </main>
  );
}
