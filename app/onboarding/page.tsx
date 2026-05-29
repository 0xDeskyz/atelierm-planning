import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { createOrganization } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Déjà une org → on saute l'onboarding
  const org = await getCurrentOrg();
  if (org) redirect("/");

  const defaultName = (user.user_metadata?.company_name as string) || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Crée ta société</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Dernière étape avant d'accéder à ton planning.
        </p>

        <form action={createOrganization} className="mt-6 space-y-3">
          <input
            type="text"
            name="name"
            required
            defaultValue={defaultName}
            placeholder="Nom de la société"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {searchParams.error && (
            <p className="text-sm text-red-500">
              Impossible de créer la société. Réessaie.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white"
          >
            Créer et accéder au planning
          </button>
        </form>
      </div>
    </div>
  );
}
