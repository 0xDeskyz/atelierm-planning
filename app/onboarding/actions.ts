"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    redirect("/onboarding?error=empty");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_organization", { org_name: name });
  if (error) {
    redirect("/onboarding?error=" + encodeURIComponent(error.message));
  }

  redirect("/");
}
