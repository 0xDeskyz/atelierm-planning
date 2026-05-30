import { createClient } from "@/lib/supabase/server";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "deskyzm@gmail.com").toLowerCase();

// Vrai si l'utilisateur connecté est l'admin de la plateforme.
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && user.email?.toLowerCase().trim() === ADMIN_EMAIL;
}

// À utiliser en tête de chaque server action admin : lève si non-admin.
export async function requirePlatformAdmin(): Promise<void> {
  if (!(await isPlatformAdmin())) throw new Error("forbidden");
}
