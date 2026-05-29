// Dérive l'organisation de l'utilisateur connecté.
// La clé du planning devient `org-{orgId}` au lieu de la constante `planner-main`.
import { createClient } from "@/lib/supabase/server";

export type CurrentOrg = {
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  stateKey: string; // clé planner_state pour cette org
  plan: string;
  trialEnds: string | null;
  stripeCustomerId: string | null;
};

// Accès autorisé si plan payant actif, ou essai non expiré (fail-open si inconnu).
export function hasAccess(org: { plan: string; trialEnds: string | null }): boolean {
  if (org.plan === "starter" || org.plan === "pro") return true;
  if (!org.trialEnds) return true; // pas de date → on n'enferme pas
  return new Date(org.trialEnds).getTime() > Date.now();
}

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
    .select("org_id, role, organizations(name, plan, trial_ends, stripe_customer_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const orgRel: any = (data as any).organizations;
  const o = Array.isArray(orgRel) ? orgRel[0] : orgRel;

  return {
    orgId: data.org_id,
    orgName: o?.name || "Ma société",
    role: data.role,
    stateKey: stateKeyForOrg(data.org_id),
    plan: o?.plan || "trial",
    trialEnds: o?.trial_ends || null,
    stripeCustomerId: o?.stripe_customer_id || null,
  };
}
