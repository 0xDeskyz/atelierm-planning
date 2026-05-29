import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/auth/org";
import PlannerApp from "./_planner/PlannerApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const org = await getCurrentOrg();

  // Connecté mais sans organisation → onboarding (création de société)
  if (!org) {
    redirect("/onboarding");
  }

  return (
    <PlannerApp
      stateKey={org.stateKey}
      canEdit={org.role === "owner" || org.role === "admin"}
    />
  );
}
