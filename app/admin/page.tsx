import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminDashboard, { type OrgRow, type MemberRow, type MonthPoint } from "./AdminDashboard";

export const dynamic = "force-dynamic";

const PLAN_AMOUNT: Record<string, number> = { starter: 49, pro: 99 };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminPage() {
  if (!(await isPlatformAdmin())) notFound();

  const admin = createAdminClient();

  // Organisations + nombre de membres
  const { data: orgsRaw } = await admin
    .from("organizations")
    .select("id, name, slug, plan, trial_ends, suspended, stripe_customer_id, stripe_subscription_id, created_at, memberships(count)")
    .order("created_at", { ascending: false });

  // Tous les membres + nom de l'org
  const { data: membersRaw } = await admin
    .from("memberships")
    .select("user_id, role, created_at, org_id, organizations(name)")
    .order("created_at", { ascending: false });

  // Emails via l'API admin auth (id → email)
  const emailById = new Map<string, string>();
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersData?.users || []) emailById.set(u.id, u.email || "");
  } catch {}

  const now = Date.now();

  const orgs: OrgRow[] = (orgsRaw || []).map((o: any) => {
    const trialExpired =
      o.plan === "trial" && o.trial_ends && new Date(o.trial_ends).getTime() <= now;
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      trialEnds: o.trial_ends,
      suspended: !!o.suspended,
      trialExpired: !!trialExpired,
      memberCount: o.memberships?.[0]?.count ?? 0,
      hasStripe: !!o.stripe_customer_id,
      createdAt: o.created_at,
    };
  });

  const members: MemberRow[] = (membersRaw || []).map((m: any) => ({
    userId: m.user_id,
    email: emailById.get(m.user_id) || "—",
    role: m.role,
    orgName: Array.isArray(m.organizations) ? m.organizations[0]?.name : m.organizations?.name,
    createdAt: m.created_at,
  }));

  // Séries mensuelles (12 derniers mois) : nouvelles orgs + MRR cumulé estimé
  const buckets: MonthPoint[] = [];
  const labelFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" });
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: labelFmt.format(d), nouvelles: 0, mrr: 0 });
  }
  const bucketIdx = new Map(buckets.map((b, i) => [b.key, i]));

  for (const o of orgsRaw || []) {
    const created = new Date(o.created_at);
    const k = monthKey(created);
    const idx = bucketIdx.get(k);
    if (idx !== undefined) buckets[idx].nouvelles += 1;

    // MRR cumulé : on ajoute le montant du plan à tous les mois >= création
    const amount = PLAN_AMOUNT[o.plan] || 0;
    if (amount > 0) {
      const startIdx = idx !== undefined ? idx : 0;
      for (let j = Math.max(startIdx, 0); j < buckets.length; j++) buckets[j].mrr += amount;
    }
  }

  return <AdminDashboard orgs={orgs} members={members} series={buckets} />;
}
