import Link from "next/link";
import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import OrgActions from "./OrgActions";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = { trial: "Trial", starter: "Starter", pro: "Pro" };
const ROLE_LABEL: Record<string, string> = { owner: "Propriétaire", admin: "Admin", member: "Lecture seule" };

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function OrgDetailPage({ params }: { params: { orgId: string } }) {
  if (!(await isPlatformAdmin())) notFound();

  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", params.orgId)
    .single();

  if (!org) notFound();

  const { data: membersRaw } = await admin
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("org_id", params.orgId)
    .order("created_at", { ascending: true });

  const { data: invitations } = await admin
    .from("invitations")
    .select("email, role, created_at")
    .eq("org_id", params.orgId);

  // Emails des membres
  const emailById = new Map<string, string>();
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersData?.users || []) emailById.set(u.id, u.email || "");
  } catch {}

  const members = (membersRaw || []).map((m) => ({
    ...m,
    email: emailById.get(m.user_id) || "—",
  }));

  const now = Date.now();
  const trialExpired = org.plan === "trial" && org.trial_ends && new Date(org.trial_ends).getTime() <= now;
  const trialDaysLeft = org.trial_ends
    ? Math.ceil((new Date(org.trial_ends).getTime() - now) / 86400000)
    : null;

  const infoRows: [string, string][] = [
    ["Slug", `/${org.slug}`],
    ["Plan actuel", PLAN_LABEL[org.plan] || org.plan],
    ["Statut", org.suspended ? "⛔ Suspendue" : trialExpired ? "⚠️ Essai expiré" : "✅ Active"],
    [
      "Fin d'essai",
      org.trial_ends
        ? `${fmtDate(org.trial_ends)}${trialDaysLeft !== null && trialDaysLeft > 0 ? ` (${trialDaysLeft} j restants)` : ""}`
        : "—",
    ],
    ["Client Stripe", org.stripe_customer_id || "—"],
    ["Abonnement Stripe", org.stripe_subscription_id || "—"],
    ["Créée le", fmtDate(org.created_at)],
  ];

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Tous les organisations
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">{org.name}</h1>
          {org.suspended && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">SUSPENDUE</span>
          )}
        </div>

        {/* Infos */}
        <div className="mt-5 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700">Informations</h2>
          <dl className="mt-3 divide-y divide-neutral-100 text-sm">
            {infoRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-right font-medium text-neutral-900 break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Actions admin */}
        <OrgActions orgId={org.id} orgName={org.name} plan={org.plan} suspended={!!org.suspended} />

        {/* Membres */}
        <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700">Membres ({members.length})</h2>
          <ul className="mt-3 divide-y divide-neutral-100 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between py-2">
                <span className="font-medium text-neutral-900">{m.email}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {ROLE_LABEL[m.role] || m.role}
                </span>
              </li>
            ))}
            {members.length === 0 && <li className="py-2 text-neutral-400">Aucun membre.</li>}
          </ul>

          {invitations && invitations.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Invitations en attente
              </h3>
              <ul className="mt-2 divide-y divide-neutral-100 text-sm">
                {invitations.map((inv, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-neutral-500">
                    <span>{inv.email}</span>
                    <span className="text-xs">{ROLE_LABEL[inv.role] || inv.role}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
