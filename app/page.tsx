import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg, hasAccess } from "@/lib/auth/org";
import PlannerApp from "./_planner/PlannerApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();

  // Connecté mais sans organisation → onboarding (création de société)
  if (!org) {
    redirect("/onboarding");
  }

  // Essai terminé et pas d'abonnement → page de facturation
  if (!hasAccess(org)) {
    redirect("/facturation?expired=1");
  }

  return (
    <PlannerApp
      stateKey={org.stateKey}
      canEdit={org.role === "owner" || org.role === "admin"}
      userEmail={user.email || ""}
      orgName={org.orgName}
      role={org.role}
    />
  );
}
