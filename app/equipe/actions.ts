"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { sendInvitationEmail } from "@/lib/email";

// Garde-fou : seul owner/admin peut gérer l'équipe.
async function requireEditor() {
  const org = await getCurrentOrg();
  if (!org || (org.role !== "owner" && org.role !== "admin")) {
    throw new Error("forbidden");
  }
  return org;
}

export async function inviteMember(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");
  if (!email) return;

  const org = await requireEditor();
  const supabase = createClient();
  const token = randomUUID();

  await supabase.from("invitations").insert({
    org_id: org.orgId,
    email,
    role: role === "admin" ? "admin" : "member",
    token,
  });

  // Email envoyé en best-effort : l'invitation reste valide même si l'envoi échoue.
  try {
    await sendInvitationEmail({ to: email, orgName: org.orgName, role, token });
  } catch {}

  revalidatePath("/equipe");
}

export async function cancelInvitation(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await requireEditor();
  const supabase = createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/equipe");
}

export async function changeRole(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "member");
  if (!userId) return;

  const org = await requireEditor();
  const supabase = createClient();

  // On ne touche pas au rôle d'un owner via ce chemin (protection du propriétaire).
  await supabase
    .from("memberships")
    .update({ role: role === "admin" ? "admin" : "member" })
    .eq("org_id", org.orgId)
    .eq("user_id", userId)
    .neq("role", "owner");

  revalidatePath("/equipe");
}

export async function removeMember(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  if (!userId) return;

  const org = await requireEditor();
  const supabase = createClient();

  // Impossible de retirer un owner.
  await supabase
    .from("memberships")
    .delete()
    .eq("org_id", org.orgId)
    .eq("user_id", userId)
    .neq("role", "owner");

  revalidatePath("/equipe");
}
