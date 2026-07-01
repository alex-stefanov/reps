import { redirect } from "next/navigation";
import { ScheduleScreen } from "@/components/schedule-screen";
import { requireUser } from "@/lib/server/current-user";
import { getActiveProgram } from "@/lib/server/program";
import { getWeekView } from "@/lib/server/schedule-view";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const user = await requireUser();
  const program = await getActiveProgram(user.id);
  if (!program) redirect("/onboarding");

  const { w } = await searchParams;
  const requested = w === undefined ? undefined : Number(w);
  const week = await getWeekView(
    user,
    program,
    requested === undefined || Number.isNaN(requested) ? undefined : requested,
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
      <ScheduleScreen
        week={week}
        hoursPerWeek={program.hoursPerWeek}
        intensity={program.intensity}
      />
    </main>
  );
}
