import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook Stripe : tient à jour organizations.plan selon le cycle de vie
// de l'abonnement (création, renouvellement, annulation). Nécessite
// STRIPE_WEBHOOK_SECRET et SUPABASE_SERVICE_ROLE_KEY.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 500 });

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig!, secret);
  } catch (err: any) {
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orgId = s.metadata?.org_id;
        if (orgId) {
          await admin
            .from("organizations")
            .update({
              plan: s.metadata?.plan || "starter",
              stripe_customer_id: String(s.customer || ""),
              stripe_subscription_id: String(s.subscription || ""),
            })
            .eq("id", orgId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        const active = sub.status === "active" || sub.status === "trialing";
        if (orgId) {
          await admin
            .from("organizations")
            .update({
              plan: active ? sub.metadata?.plan || "starter" : "trial",
              stripe_subscription_id: active ? sub.id : "",
            })
            .eq("id", orgId);
        }
        break;
      }
    }
  } catch {
    return new Response("Handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
