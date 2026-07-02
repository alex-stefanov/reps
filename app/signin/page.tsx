import { redirect } from "next/navigation";
import { auth, devAuthEnabled, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.githubId) redirect("/");

  return (
    <main className="flex flex-1 flex-col justify-center bg-gradient-to-b from-[#eef6ff] via-base to-[#e9f7ee] px-6 pb-24">
      <div className="mx-auto w-full max-w-sm">
        <span className="card-shadow inline-flex size-16 items-center justify-center rounded-[1.4rem] bg-accent text-3xl font-extrabold text-white">
          R
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-text">
          Reps
        </h1>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-sub">
          The daily loop, verified. Your plan says what today should contain —
          your GitHub proves you did it.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
          className="mt-10"
        >
          <button
            type="submit"
            className="card-shadow w-full rounded-2xl bg-text py-4 text-[15px] font-bold text-card transition-transform active:scale-[0.98]"
          >
            Continue with GitHub
          </button>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-mute">
          Read-only access to public activity. Reps never writes to your
          GitHub.
        </p>

        {devAuthEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev", {
                handle: formData.get("handle"),
                redirectTo: "/",
              });
            }}
            className="card-shadow mt-10 rounded-3xl bg-card p-4"
          >
            <label
              htmlFor="dev-handle"
              className="block text-xs font-bold text-warn"
            >
              Dev mode — sign in as any GitHub handle
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="dev-handle"
                name="handle"
                placeholder="octocat"
                autoComplete="off"
                className="num min-w-0 flex-1 rounded-xl bg-inset px-3.5 py-2.5 text-sm font-semibold text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="submit"
                className="rounded-xl bg-inset px-4 py-2.5 text-sm font-bold text-text active:scale-95"
              >
                Enter
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
