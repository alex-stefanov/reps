import { redirect } from "next/navigation";
import { diffDaysISO, todayISO } from "@/lib/core/dates";
import { requireUser } from "@/lib/server/current-user";
import { getActiveProgram } from "@/lib/server/program";

export default async function HomePage() {
  const user = await requireUser();
  const program = await getActiveProgram(user.id);
  if (!program) redirect("/onboarding");

  const today = todayISO(user.timezone);
  const dayNumber = diffDaysISO(program.startDate, today) + 1;

  return (
    <main className="flex flex-1 items-center justify-center">
      <h1 className="font-pixel text-2xl tracking-widest text-phos">
        DAY {dayNumber}
      </h1>
    </main>
  );
}
