import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { ChevronLeftIcon } from "@/components/icons";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/server/current-user";
import { getActiveProgram } from "@/lib/server/program";

export default async function SettingsPage() {
  const user = await requireUser();
  const program = await getActiveProgram(user.id);
  if (!program) redirect("/onboarding");

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
            Settings
          </h1>
          <p className="num mt-1 text-xs font-semibold text-sub">
            {user.githubHandle} · {program.hoursPerWeek}h/wk ·{" "}
            {program.intensity} · started {program.startDate}
          </p>
        </div>
      </div>

      <SettingsForm
        initial={{
          leetcodeOn: user.leetcodeOn,
          gymOn: user.gymOn,
          dailyCommitOn: user.dailyCommitOn,
          timezone: user.timezone,
        }}
      />

      <div className="card-shadow mt-6 rounded-3xl bg-card px-5 py-4">
        <p className="text-sm leading-relaxed text-sub">
          Want a different plan? Regenerate from the{" "}
          <Link href="/schedule" className="font-bold text-accent-deep">
            Schedule
          </Link>{" "}
          — history stays.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
        className="mt-4"
      >
        <button
          type="submit"
          className="card-shadow w-full rounded-3xl bg-card py-4 text-[15px] font-bold text-danger transition-transform active:scale-[0.99]"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
