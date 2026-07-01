import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/server/current-user";
import { getActiveProgram } from "@/lib/server/program";

export default async function SettingsPage() {
  const user = await requireUser();
  const program = await getActiveProgram(user.id);
  if (!program) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <Link
        href="/"
        className="num text-xs text-dim transition-colors hover:text-phos-bright"
      >
        ‹ HOME
      </Link>
      <h1 className="mt-6 font-pixel text-2xl tracking-wider text-phos">
        SETTINGS
      </h1>
      <p className="num mt-2 text-xs text-faint">
        {user.githubHandle} · program: {program.hoursPerWeek}h/wk ·{" "}
        {program.intensity} · started {program.startDate}
      </p>

      <SettingsForm
        initial={{
          leetcodeOn: user.leetcodeOn,
          gymOn: user.gymOn,
          dailyCommitOn: user.dailyCommitOn,
          timezone: user.timezone,
        }}
      />

      <div className="mt-10 border-t border-line pt-6">
        <p className="text-xs leading-relaxed text-dim">
          Want a different plan? Regenerate from the{" "}
          <Link
            href="/schedule"
            className="text-phos hover:text-phos-bright"
          >
            Schedule
          </Link>{" "}
          — history stays.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="border border-line px-4 py-2 text-sm text-dim transition-colors hover:border-danger/60 hover:text-danger active:translate-y-px"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
