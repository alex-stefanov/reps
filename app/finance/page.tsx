import { PhaseStub } from "@/components/phase-stub";
import { requireUser } from "@/lib/server/current-user";

export default async function FinancePage() {
  await requireUser();
  return (
    <PhaseStub
      title="FINANCE"
      blurb="Income and spending as growth — period charts, categories, and the money-flow Sankey. Manual entry first, receipt scan later."
    />
  );
}
