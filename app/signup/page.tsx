"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
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

    // 1) Créer le compte. Le nom de société est passé en metadata et sera
    //    utilisé par l'onboarding (Phase 1) pour créer l'organisation.
    const { error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: company },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (signErr) {
      setError(signErr.message);
      return;
    }
    // Si la confirmation email est activée, on affiche un message.
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
        <h1 className="text-xl font-bold text-neutral-900">Créer une société</h1>
        <p className="mt-1 text-sm text-neutral-500">14 jours d'essai, sans carte bancaire.</p>

        <form onSubmit={handleSignup} className="mt-6 space-y-3">
          <input
            type="text"
            required
            placeholder="Nom de la société"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
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
            {loading ? "Création…" : "Démarrer l'essai gratuit"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
