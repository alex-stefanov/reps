import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireUser } from "@/lib/server/current-user";
import { getActiveProgram } from "@/lib/server/program";

export default async function OnboardingPage() {
  const user = await requireUser();
  const program = await getActiveProgram(user.id);
  if (program) redirect("/");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <p className="num text-xs text-faint">
        {`// ${user.githubHandle} · program setup`}
      </p>
      <h1 className="mt-2 font-pixel text-2xl tracking-wider text-phos">
        CALIBRATE
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        Two questions generate your whole plan. You can edit every cell of it
        afterwards, or regenerate from scratch anytime.
      </p>
      <OnboardingForm />
    </main>
  );
}
