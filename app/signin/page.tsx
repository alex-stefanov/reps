import { redirect } from "next/navigation";
import { auth, devAuthEnabled, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.githubId) redirect("/");

  return (
    <main className="flex flex-1 flex-col justify-center px-6 pb-24">
      <div className="mx-auto w-full max-w-sm">
        <p className="num text-xs text-faint">
          {"// personal operating system"}
        </p>
        <h1 className="mt-3 font-pixel text-4xl tracking-wider text-phos">
          REPS
        </h1>
        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-dim">
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
            className="w-full border border-line-bright bg-raised px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:border-phos-dim hover:text-phos-bright active:translate-y-px"
          >
            <span className="num mr-3 text-phos">›</span>
            Sign in with GitHub
          </button>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-faint">
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
            className="mt-10 border-t border-line pt-6"
          >
            <label
              htmlFor="dev-handle"
              className="num block text-xs text-warn"
            >
              DEV MODE — sign in as any GitHub handle
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="dev-handle"
                name="handle"
                placeholder="octocat"
                autoComplete="off"
                className="num min-w-0 flex-1 border border-line bg-panel px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-phos-dim focus:outline-none"
              />
              <button
                type="submit"
                className="border border-line-bright bg-raised px-4 py-2 text-sm text-fg hover:border-phos-dim active:translate-y-px"
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
