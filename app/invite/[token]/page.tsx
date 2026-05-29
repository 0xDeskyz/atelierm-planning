import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  member: "Lecture seule",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Infos de l'invitation (via RPC : le token est le secret)
  const { data: info } = await supabase.rpc("invitation_info", { p_token: params.token });
  const inv = Array.isArray(info) ? info[0] : info;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm text-center">{children}</div>
    </div>
  );

  if (!inv) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-neutral-900">Invitation introuvable</h1>
        <p className="mt-2 text-sm text-neutral-500">Ce lien est invalide ou a été annulé.</p>
      </Shell>
    );
  }

  if (inv.expired) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-neutral-900">Invitation expirée</h1>
        <p className="mt-2 text-sm text-neutral-500">Demande à ton contact de t'en renvoyer une.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-neutral-900">Rejoindre {inv.org_name}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Tu es invité comme <strong>{ROLE_LABEL[inv.role] || inv.role}</strong>.
      </p>
      {searchParams.error && (
        <p className="mt-3 text-sm text-red-500">Impossible d'accepter l'invitation. Réessaie.</p>
      )}

      {user ? (
        <form action={acceptInvitation} className="mt-6">
          <input type="hidden" name="token" value={params.token} />
          <button type="submit" className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white">
            Rejoindre l'équipe
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-neutral-600">Connecte-toi ou crée un compte pour rejoindre :</p>
          <Link
            href={`/login?next=/invite/${params.token}`}
            className="block w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white"
          >
            Se connecter
          </Link>
          <Link
            href={`/signup?next=/invite/${params.token}`}
            className="block w-full rounded-lg border py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Créer un compte
          </Link>
        </div>
      )}
    </Shell>
  );
}
