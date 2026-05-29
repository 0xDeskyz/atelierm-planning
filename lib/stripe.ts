import Stripe from "stripe";

// Initialisation paresseuse : on ne crée le client qu'au premier appel (sinon
// le build plante car STRIPE_SECRET_KEY n'est pas défini au moment du build).
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

// Définition des offres (montants en centimes, EUR)
export const PLANS = {
  starter: { label: "Starter", amount: 4900, lookupKey: "atelierm_starter_monthly" },
  pro: { label: "Pro", amount: 9900, lookupKey: "atelierm_pro_monthly" },
} as const;

export type PlanId = keyof typeof PLANS;

// Récupère (ou crée à la volée) le Price Stripe correspondant à un plan.
// Évite d'avoir à créer manuellement les produits/prix dans le dashboard.
export async function getPriceId(plan: PlanId): Promise<string> {
  const stripe = getStripe();
  const def = PLANS[plan];
  const existing = await stripe.prices.list({
    lookup_keys: [def.lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0].id;

  const product = await stripe.products.create({ name: `Atelier M Planning — ${def.label}` });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: def.amount,
    currency: "eur",
    recurring: { interval: "month" },
    lookup_key: def.lookupKey,
  });
  return price.id;
}
