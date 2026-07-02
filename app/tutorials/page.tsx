import { PhaseStub } from "@/components/phase-stub";
import { requireUser } from "@/lib/server/current-user";

export default async function TutorialsPage() {
  await requireUser();
  return (
    <PhaseStub
      title="Tutorials"
      blurb="The curated learning library — build-your-own-X guides and from-scratch videos, filterable by language and topic."
    />
  );
}
