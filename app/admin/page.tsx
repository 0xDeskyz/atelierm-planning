import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "deskyzm@gmail.com";

const PLAN_AMOUNT: Record<string, number> = {
  starter: 49,
  pro: 99,
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) notFound();

  const admin = createAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select("*, memberships(count)")
    .order("created_at", { ascending: false });

  const all = orgs || [];
  const now = Date.now();

  const totalOrgs = all.length;
  const paidOrgs = all.filter((o) => o.plan === "starter" || o.plan === "pro");
  const starterCount = all.filter((o) => o.plan === "starter").length;
  const proCount = all.filter((o) => o.plan === "pro").length;
  const activeTrials = all.filter(
    (o) => o.plan === "trial" && o.trial_ends && new Date(o.trial_ends).getTime() > now
  ).length;
  const expiredTrials = all.filter(
    (o) => o.plan === "trial" && (!o.trial_ends || new Date(o.trial_ends).getTime() <= now)
  ).length;
  const newLast30d = all.filter(
    (o) => new Date(o.created_at).getTime() > now - 30 * 86400_000
  ).length;
  const mrr = paidOrgs.reduce((sum, o) => sum + (PLAN_AMOUNT[o.plan] || 0), 0);

  const stats = [
    { label: "MRR", value: `${fmt(mrr)} €`, sub: `${paidOrgs.length} abonnés` },
    { label: "Orgs totales", value: fmt(totalOrgs), sub: `+${newLast30d} ce mois` },
    { label: "Trials actifs", value: fmt(activeTrials), sub: `${expiredTrials} expirés` },
    { label: "Starter / Pro", value: `${starterCount} / ${proCount}`, sub: "plans payants" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard Admin</h1>
          <span className="text-xs text-neutral-400">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{s.label}</div>
              <div className="mt-1 text-2xl font-extrabold text-neutral-900">{s.value}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Orgs table */}
        <div className="mt-8 rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">Toutes les organisations</h2>
            <span className="text-xs text-neutral-400">{totalOrgs} au total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                  <th className="px-5 py-3">Organisation</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Membres</th>
                  <th className="px-5 py-3">Trial jusqu'au</th>
                  <th className="px-5 py-3">Créée le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {all.map((org) => {
                  const memberCount = (org.memberships as any)?.[0]?.count ?? 0;
                  const trialExpired =
                    org.plan === "trial" &&
                    org.trial_ends &&
                    new Date(org.trial_ends).getTime() <= now;

                  return (
                    <tr key={org.id} className="hover:bg-neutral-50 transition">
                      <td className="px-5 py-3 font-medium text-neutral-900">
                        {org.name}
                        <span className="ml-2 text-xs text-neutral-400">/{org.slug}</span>
                      </td>
                      <td className="px-5 py-3">
                        <PlanBadge plan={org.plan} expired={!!trialExpired} />
                      </td>
                      <td className="px-5 py-3 text-neutral-600">{memberCount}</td>
                      <td className="px-5 py-3 text-neutral-500">
                        {org.trial_ends ? (
                          <span className={trialExpired ? "text-red-500" : ""}>
                            {fmtDate(org.trial_ends)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-neutral-500">{fmtDate(org.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {all.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-neutral-400">Aucune organisation.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanBadge({ plan, expired }: { plan: string; expired: boolean }) {
  const styles: Record<string, string> = {
    pro: "bg-violet-100 text-violet-700",
    starter: "bg-emerald-100 text-emerald-700",
    trial: expired ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700",
  };
  const labels: Record<string, string> = {
    pro: "Pro",
    starter: "Starter",
    trial: expired ? "Expiré" : "Trial",
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[plan] || "bg-neutral-100 text-neutral-600"}`}>
      {labels[plan] || plan}
    </span>
  );
}
