import { PhaseStub } from "@/components/phase-stub";
import { requireUser } from "@/lib/server/current-user";

export default async function IdeasPage() {
  await requireUser();
  return (
    <PhaseStub
      title="IDEAS POOL"
      blurb="Every project idea in one filterable pool — BYOX, SaaS, Project — placeable into the Schedule as Project Work, with an AI brainstorm partner."
    />
  );
}
