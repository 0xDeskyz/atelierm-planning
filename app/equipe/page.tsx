import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import TeamManager from "./TeamManager";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/onboarding");

  const isEditor = org.role === "owner" || org.role === "admin";

  // Membres (via RPC security definer qui joint auth.users)
  const { data: members } = await supabase.rpc("org_members", { p_org_id: org.orgId });

  // Invitations en attente (lisibles par owner/admin via RLS)
  const { data: invs } = isEditor
    ? await supabase
        .from("invitations")
        .select("id, email, role, token, accepted_at")
        .eq("org_id", org.orgId)
        .is("accepted_at", null)
    : { data: [] };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
              <ArrowLeft className="w-4 h-4" /> Retour au planning
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-neutral-900">Équipe — {org.orgName}</h1>
          </div>
        </div>

        {isEditor ? (
          <TeamManager
            members={(members as any) || []}
            invitations={(invs as any) || []}
            currentUserId={user.id}
            isOwner={org.role === "owner"}
          />
        ) : (
          <div className="rounded-xl border bg-white p-6 text-sm text-neutral-600">
            Seuls le propriétaire et les administrateurs peuvent gérer l'équipe.
            <ul className="mt-4 divide-y">
              {((members as any) || []).map((m: any) => (
                <li key={m.user_id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-neutral-800">{m.email}</span>
                  <span className="text-xs text-neutral-500">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
