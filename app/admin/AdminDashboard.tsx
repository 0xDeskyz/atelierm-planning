"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type OrgRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trialEnds: string | null;
  suspended: boolean;
  trialExpired: boolean;
  memberCount: number;
  hasStripe: boolean;
  createdAt: string;
};

export type MemberRow = {
  userId: string;
  email: string;
  role: string;
  orgName?: string;
  createdAt: string;
};

export type MonthPoint = { key: string; label: string; nouvelles: number; mrr: number };

const PLAN_AMOUNT: Record<string, number> = { starter: 49, pro: 99 };

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

type Filter = "all" | "trial" | "paid" | "expired" | "suspended";

export default function AdminDashboard({
  orgs,
  members,
  series,
}: {
  orgs: OrgRow[];
  members: MemberRow[];
  series: MonthPoint[];
}) {
  const [tab, setTab] = useState<"orgs" | "members">("orgs");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "members">("recent");

  const now = Date.now();
  const paidOrgs = orgs.filter((o) => o.plan === "starter" || o.plan === "pro");
  const mrr = paidOrgs.reduce((s, o) => s + (PLAN_AMOUNT[o.plan] || 0), 0);
  const activeTrials = orgs.filter((o) => o.plan === "trial" && !o.trialExpired && !o.suspended).length;
  const expiredTrials = orgs.filter((o) => o.trialExpired).length;
  const suspendedCount = orgs.filter((o) => o.suspended).length;
  const newLast30d = orgs.filter((o) => new Date(o.createdAt).getTime() > now - 30 * 86400_000).length;

  const stats = [
    { label: "MRR", value: `${fmt(mrr)} €`, sub: `${paidOrgs.length} abonnés` },
    { label: "Orgs totales", value: fmt(orgs.length), sub: `+${newLast30d} ce mois` },
    { label: "Trials actifs", value: fmt(activeTrials), sub: `${expiredTrials} expirés` },
    { label: "Suspendues", value: fmt(suspendedCount), sub: `${members.length} membres` },
  ];

  const counts = {
    all: orgs.length,
    trial: orgs.filter((o) => o.plan === "trial" && !o.trialExpired).length,
    paid: paidOrgs.length,
    expired: expiredTrials,
    suspended: suspendedCount,
  };

  const filtered = useMemo(() => {
    let list = orgs.filter((o) => {
      if (filter === "trial") return o.plan === "trial" && !o.trialExpired;
      if (filter === "paid") return o.plan === "starter" || o.plan === "pro";
      if (filter === "expired") return o.trialExpired;
      if (filter === "suspended") return o.suspended;
      return true;
    });
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "members") return b.memberCount - a.memberCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [orgs, filter, query, sort]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.email.toLowerCase().includes(q) || (m.orgName || "").toLowerCase().includes(q)
    );
  }, [members, query]);

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard Admin</h1>
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Retour au planning
          </Link>
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

        {/* Graphiques */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-700">MRR estimé (cumul)</h3>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#a3a3a3" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#a3a3a3" />
                  <Tooltip formatter={(v: number) => [`${fmt(v)} €`, "MRR"]} />
                  <Area type="monotone" dataKey="mrr" stroke="#8b5cf6" strokeWidth={2} fill="url(#mrrGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-700">Nouvelles inscriptions / mois</h3>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#a3a3a3" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="#a3a3a3" />
                  <Tooltip formatter={(v: number) => [fmt(v), "Nouvelles"]} />
                  <Bar dataKey="nouvelles" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mt-8 flex items-center gap-1 border-b">
          <TabBtn active={tab === "orgs"} onClick={() => setTab("orgs")}>
            Organisations ({orgs.length})
          </TabBtn>
          <TabBtn active={tab === "members"} onClick={() => setTab("members")}>
            Membres ({members.length})
          </TabBtn>
        </div>

        {/* Recherche */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "orgs" ? "Rechercher une org…" : "Rechercher un membre / email…"}
            className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
          />
          {tab === "orgs" && (
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="recent">Plus récentes</option>
              <option value="name">Nom (A→Z)</option>
              <option value="members">Plus de membres</option>
            </select>
          )}
        </div>

        {tab === "orgs" && (
          <>
            {/* Filtres */}
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "paid", "trial", "expired", "suspended"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === f
                      ? "bg-neutral-900 text-white"
                      : "bg-white border text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {{ all: "Toutes", paid: "Payantes", trial: "Trial", expired: "Expirées", suspended: "Suspendues" }[f]}{" "}
                  ({counts[f]})
                </button>
              ))}
            </div>

            {/* Table orgs */}
            <div className="mt-4 rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                      <th className="px-5 py-3">Organisation</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Membres</th>
                      <th className="px-5 py-3">Trial</th>
                      <th className="px-5 py-3">Créée le</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filtered.map((org) => (
                      <tr key={org.id} className="hover:bg-neutral-50 transition">
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {org.name}
                          <span className="ml-2 text-xs text-neutral-400">/{org.slug}</span>
                          {org.suspended && (
                            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                              SUSPENDUE
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <PlanBadge plan={org.plan} expired={org.trialExpired} />
                        </td>
                        <td className="px-5 py-3 text-neutral-600">{org.memberCount}</td>
                        <td className="px-5 py-3 text-neutral-500">
                          {org.trialEnds ? (
                            <span className={org.trialExpired ? "text-red-500" : ""}>{fmtDate(org.trialEnds)}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-neutral-500">{fmtDate(org.createdAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/admin/${org.id}`} className="text-violet-600 hover:underline font-medium">
                            Gérer →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-neutral-400">Aucun résultat.</p>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "members" && (
          <div className="mt-4 rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Organisation</th>
                    <th className="px-5 py-3">Rôle</th>
                    <th className="px-5 py-3">Rejoint le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredMembers.map((m, i) => (
                    <tr key={`${m.userId}-${i}`} className="hover:bg-neutral-50 transition">
                      <td className="px-5 py-3 font-medium text-neutral-900">{m.email}</td>
                      <td className="px-5 py-3 text-neutral-600">{m.orgName || "—"}</td>
                      <td className="px-5 py-3">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="px-5 py-3 text-neutral-500">{fmtDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMembers.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-neutral-400">Aucun membre.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"
      }`}
    >
      {children}
    </button>
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

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = { owner: "Propriétaire", admin: "Admin", member: "Lecture seule" };
  return (
    <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
      {labels[role] || role}
    </span>
  );
}
