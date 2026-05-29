"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";
  const isInvite = next.startsWith("/invite/");

  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: isInvite ? "" : company },
        emailRedirectTo: redirectTo,
      },
    });
    setLoading(false);

    if (signErr) {
      setError(signErr.message);
      return;
    }
    // Confirmation email désactivée → session immédiate : on redirige.
    if (data.session) {
      router.push(next || "/");
      router.refresh();
      return;
    }
    // Sinon, confirmation requise.
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">Vérifie tes emails</h1>
          <p className="mt-2 text-sm text-neutral-500">
            On vient d'envoyer un lien de confirmation à <strong>{email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">
          {isInvite ? "Créer ton compte" : "Créer une société"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isInvite ? "Pour rejoindre l'équipe qui t'a invité." : "14 jours d'essai, sans carte bancaire."}
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-3">
          {!isInvite && (
            <input
              type="text"
              required
              placeholder="Nom de la société"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe (6 caractères min.)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Création…" : isInvite ? "Créer mon compte" : "Démarrer l'essai gratuit"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Déjà un compte ?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-neutral-900 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
