import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import PlannerApp from "./_planner/PlannerApp";

export const dynamic = "force-dynamic";

// Accès simplifié : connexion requise → planning. Plus d'onboarding,
// plus d'essai, plus de facturation bloquante. Le planning est partagé
// sur une clé fixe (ou celle de l'org existante si présente).
const FALLBACK_STATE_KEY = "planner-main";

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non connecté → page de connexion
  if (!user) {
    redirect("/login");
  }

  // On récupère l'org si elle existe (pour réutiliser son planning),
  // mais on ne bloque jamais : pas d'org → clé fixe partagée.
  const org = await getCurrentOrg();
  const stateKey = org?.stateKey || FALLBACK_STATE_KEY;

  return (
    <PlannerApp
      stateKey={stateKey}
      canEdit={true}
      userEmail={user.email || ""}
      orgName={org?.orgName || "Atelier M"}
      role={org?.role || "owner"}
    />
  );
}
