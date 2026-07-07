import Link from "next/link";
import { CustomizeScreen } from "@/components/customize-screen";
import { ChevronLeftIcon } from "@/components/icons";
import { parseCosmetics } from "@/lib/core/cosmetics";
import { addDaysISO, todayISO, isoWeekday } from "@/lib/core/dates";
import { requireUser } from "@/lib/server/current-user";
import type { SceneDay } from "@/lib/server/home-view";

/** Customize the character (spec §10): gallery lighting, live-previewed. */
export default async function CustomizePage() {
  const user = await requireUser();
  const cosmetics = parseCosmetics(user.cosmetics);

  // A representative week for the preview hero: a few days lit, today mid-way.
  const today = todayISO(user.timezone);
  const monday = addDaysISO(today, -isoWeekday(today));
  const previewLevels = [3, 4, 2, 3, 0, 0, 0];
  const previewWeek: SceneDay[] = previewLevels.map((level, i) => {
    const date = addDaysISO(monday, i);
    return {
      date,
      level,
      complete: level >= 3,
      broken: false,
      isToday: date === today,
      isFuture: date > today,
    };
  });

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
        <div>
          <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-text">
            Customize
          </h1>
          <p className="mt-1 text-xs font-semibold text-sub">
            Make the character yours
          </p>
        </div>
      </div>

      <CustomizeScreen
        initialAmbiance={cosmetics.ambiance}
        previewWeek={previewWeek}
      />
    </main>
  );
}
