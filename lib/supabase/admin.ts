// Client Supabase admin (service role) — bypass RLS.
// À n'utiliser QUE côté serveur dans des contextes sans session utilisateur
// (ex : webhook Stripe). Nécessite SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
