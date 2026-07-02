import { PhaseStub } from "@/components/phase-stub";
import { requireUser } from "@/lib/server/current-user";

export default async function CustomizePage() {
  await requireUser();
  return (
    <PhaseStub
      title="Customize"
      blurb="Build the character from appearance options; earn and equip cosmetics. For now the little builder wears the default hoodie."
    />
  );
}
