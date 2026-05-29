"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { getStripe, getPriceId, PLANS, type PlanId } from "@/lib/stripe";

function baseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function startCheckout(formData: FormData) {
  const plan = String(formData.get("plan") || "") as PlanId;
  if (!PLANS[plan]) redirect("/facturation?error=plan");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/onboarding");
  if (org.role !== "owner") redirect("/facturation?error=owner");

  const priceId = await getPriceId(plan);
  const origin = baseUrl();

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: org.stripeCustomerId || undefined,
    customer_email: org.stripeCustomerId ? undefined : user.email || undefined,
    success_url: `${origin}/facturation?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/facturation?canceled=1`,
    metadata: { org_id: org.orgId, plan },
    subscription_data: { metadata: { org_id: org.orgId, plan } },
    allow_promotion_codes: true,
  });

  if (session.url) redirect(session.url);
  redirect("/facturation?error=checkout");
}

export async function openPortal() {
  const org = await getCurrentOrg();
  if (!org) redirect("/onboarding");
  if (org.role !== "owner") redirect("/facturation?error=owner");
  if (!org.stripeCustomerId) redirect("/facturation");

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${baseUrl()}/facturation`,
  });
  redirect(session.url);
}
