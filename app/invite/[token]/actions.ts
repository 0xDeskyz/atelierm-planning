"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") || "");
  if (!token) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${token}`);

  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) {
    redirect(`/invite/${token}?error=1`);
  }
  redirect("/");
}
