import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg, hasAccess } from "@/lib/auth/org";
import PlannerApp from "./_planner/PlannerApp";
import Landing from "./_landing/Landing";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visiteur non connecté → page d'accueil marketing
  if (!user) {
    return <Landing />;
  }

  const org = await getCurrentOrg();

  // Connecté mais sans organisation → onboarding (création de société)
  if (!org) {
    redirect("/onboarding");
  }

  // Org suspendue par l'admin → message dédié
  if (org.suspended) {
    redirect("/facturation?suspended=1");
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
