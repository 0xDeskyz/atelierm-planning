"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/admin";

const VALID_PLANS = ["trial", "starter", "pro"];

// Change le forfait d'une org (geste commercial / correction).
export async function changePlan(formData: FormData) {
  await requirePlatformAdmin();
  const orgId = String(formData.get("orgId") || "");
  const plan = String(formData.get("plan") || "");
  if (!orgId || !VALID_PLANS.includes(plan)) return;

  const admin = createAdminClient();
  await admin.from("organizations").update({ plan }).eq("id", orgId);

  revalidatePath("/admin");
  revalidatePath(`/admin/${orgId}`);
}

// Prolonge / fixe la date de fin d'essai. days > 0 ajoute à partir de maintenant.
export async function extendTrial(formData: FormData) {
  await requirePlatformAdmin();
  const orgId = String(formData.get("orgId") || "");
  const days = parseInt(String(formData.get("days") || "0"), 10);
  if (!orgId || !Number.isFinite(days) || days <= 0) return;

  const newEnd = new Date(Date.now() + days * 86400_000).toISOString();
  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({ trial_ends: newEnd, plan: "trial" })
    .eq("id", orgId);

  revalidatePath("/admin");
  revalidatePath(`/admin/${orgId}`);
}

// Suspend ou réactive l'accès (impayé, abus). suspend = "1" pour couper.
export async function toggleSuspend(formData: FormData) {
  await requirePlatformAdmin();
  const orgId = String(formData.get("orgId") || "");
  const suspend = String(formData.get("suspend") || "") === "1";
  if (!orgId) return;

  const admin = createAdminClient();
  await admin.from("organizations").update({ suspended: suspend }).eq("id", orgId);

  revalidatePath("/admin");
  revalidatePath(`/admin/${orgId}`);
}

// Suppression complète (cascade : memberships, invitations, planner_state).
// Garde-fou : exige la confirmation du nom exact côté formulaire.
export async function deleteOrg(formData: FormData) {
  await requirePlatformAdmin();
  const orgId = String(formData.get("orgId") || "");
  const confirmName = String(formData.get("confirmName") || "").trim();
  if (!orgId || !confirmName) return;

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  // On ne supprime que si le nom tapé correspond exactement.
  if (!org || org.name.trim() !== confirmName) return;

  // Nettoie l'état du planning (clé org-{id}) puis l'org (cascade FK).
  await admin.from("planner_state").delete().eq("key", `org-${orgId}`);
  await admin.from("planner_state_backup").delete().eq("key", `org-${orgId}`);
  await admin.from("organizations").delete().eq("id", orgId);

  revalidatePath("/admin");
}
