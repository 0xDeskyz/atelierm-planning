// Dérive l'organisation de l'utilisateur connecté.
// La clé du planning devient `org-{orgId}` au lieu de la constante `planner-main`.
import { createClient } from "@/lib/supabase/server";

export type CurrentOrg = {
  orgId: string;
  role: "owner" | "admin" | "member";
  stateKey: string; // clé planner_state pour cette org
};

export function stateKeyForOrg(orgId: string) {
  return `org-${orgId}`;
}

// Retourne l'org "active" de l'utilisateur (la première dont il est membre).
// Multi-org par utilisateur : géré plus tard via un sélecteur d'org.
export async function getCurrentOrg(): Promise<CurrentOrg | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    orgId: data.org_id,
    role: data.role,
    stateKey: stateKeyForOrg(data.org_id),
  };
}
