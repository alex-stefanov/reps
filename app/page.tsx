import { requireUser } from "@/lib/server/current-user";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 items-center justify-center">
      <h1 className="font-pixel text-2xl tracking-widest text-phos">
        REPS · {user.githubHandle}
      </h1>
    </main>
  );
}
