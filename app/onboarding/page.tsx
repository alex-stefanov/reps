import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireUser } from "@/lib/server/current-user";
import { getActiveProgram } from "@/lib/server/program";

export default async function OnboardingPage() {
  const user = await requireUser();
  const program = await getActiveProgram(user.id);
  if (program) redirect("/");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
      <p className="num text-xs font-bold text-mute">
        {user.githubHandle} · program setup
      </p>
      <h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-tight text-text">
        Calibrate
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-sub">
        Two questions generate your whole plan. Every cell stays editable, and
        you can regenerate anytime.
      </p>
      <OnboardingForm />
    </main>
  );
}
