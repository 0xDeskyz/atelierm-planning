import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { getStripe, PLANS } from "@/lib/stripe";
import { startCheckout, openPortal } from "./actions";

export const dynamic = "force-dynamic";

const FEATURES = [
  "Planning d'équipe illimité",
  "Multi-utilisateurs & rôles",
  "Synchronisation temps réel",
  "Sauvegardes automatiques",
];

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: { success?: string; session_id?: string; canceled?: string; error?: string; expired?: string; suspended?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let org = await getCurrentOrg();
  if (!org) redirect("/onboarding");

  // Retour de paiement réussi : on vérifie la session côté Stripe puis on
  // applique le plan (chemin sans webhook, pour tester immédiatement).
  if (searchParams.success === "1" && searchParams.session_id && org.role === "owner") {
    try {
      const session = await getStripe().checkout.sessions.retrieve(searchParams.session_id);
      if (session.status === "complete" && session.metadata?.org_id === org.orgId) {
        await supabase
          .from("organizations")
          .update({
            plan: session.metadata?.plan || "starter",
            stripe_customer_id: String(session.customer || ""),
            stripe_subscription_id: String(session.subscription || ""),
          })
          .eq("id", org.orgId);
        org = await getCurrentOrg(); // refléter le nouveau plan
      }
    } catch {}
  }

  const isPaid = org!.plan === "starter" || org!.plan === "pro";
  const trialDaysLeft = org!.trialEnds
    ? Math.ceil((new Date(org!.trialEnds).getTime() - Date.now()) / 86400000)
    : null;
  const isOwner = org!.role === "owner";

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="w-4 h-4" /> Retour au planning
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">Abonnement — {org!.orgName}</h1>

        {/* État courant */}
        <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
          {isPaid ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-neutral-500">Plan actuel</div>
                <div className="text-lg font-bold text-neutral-900">
                  {PLANS[org!.plan as "starter" | "pro"]?.label || org!.plan}
                </div>
              </div>
              {isOwner && org!.stripeCustomerId && (
                <form action={openPortal}>
                  <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                    Gérer mon abonnement
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div className="text-sm text-neutral-500">Période d'essai</div>
              <div className="text-lg font-bold text-neutral-900">
                {trialDaysLeft !== null && trialDaysLeft > 0
                  ? `${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""} restant${trialDaysLeft > 1 ? "s" : ""}`
                  : "Essai terminé"}
              </div>
            </div>
          )}
        </div>

        {searchParams.success === "1" && (
          <p className="mt-3 text-sm text-emerald-600">✅ Abonnement activé, merci !</p>
        )}
        {searchParams.canceled === "1" && (
          <p className="mt-3 text-sm text-neutral-500">Paiement annulé.</p>
        )}
        {searchParams.expired === "1" && (
          <p className="mt-3 text-sm text-red-500">Ton essai est terminé — choisis une offre pour continuer.</p>
        )}
        {searchParams.suspended === "1" && (
          <p className="mt-3 text-sm text-red-500">
            Ton compte est suspendu. Contacte le support pour réactiver l'accès.
          </p>
        )}
        {searchParams.error === "owner" && (
          <p className="mt-3 text-sm text-red-500">Seul le propriétaire peut gérer l'abonnement.</p>
        )}

        {/* Offres */}
        {!isPaid && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((id) => (
              <div key={id} className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="text-lg font-bold text-neutral-900">{PLANS[id].label}</div>
                <div className="mt-1 text-3xl font-extrabold text-neutral-900">
                  {(PLANS[id].amount / 100).toFixed(0)}€
                  <span className="text-sm font-medium text-neutral-400"> /mois</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                  {id === "pro" && (
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Support prioritaire
                    </li>
                  )}
                </ul>
                {isOwner ? (
                  <form action={startCheckout} className="mt-6">
                    <input type="hidden" name="plan" value={id} />
                    <button className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white">
                      Choisir {PLANS[id].label}
                    </button>
                  </form>
                ) : (
                  <p className="mt-6 text-xs text-neutral-400">
                    Seul le propriétaire peut souscrire.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
