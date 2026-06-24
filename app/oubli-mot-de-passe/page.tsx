"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function OubliMotDePassePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nouveau-mot-de-passe`,
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        {sent ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Email envoyé ✓</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Si un compte existe pour <strong>{email}</strong>, tu recevras un lien pour
              réinitialiser ton mot de passe dans quelques minutes.
            </p>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-semibold text-neutral-900 hover:underline"
            >
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Mot de passe oublié ?</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Entre ton email et on t'envoie un lien de réinitialisation.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                placeholder="Ton email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
            <Link
              href="/login"
              className="mt-4 block text-center text-sm text-neutral-500 hover:text-neutral-800"
            >
              ← Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
