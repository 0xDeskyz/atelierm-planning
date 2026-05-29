"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User as UserIcon, Building2, Users, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Lecture seule",
};

export default function AccountMenu({
  email,
  orgName,
  role,
}: {
  email: string;
  orgName: string;
  role: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (email || "?").slice(0, 2).toUpperCase();

  const logout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Mon compte"
        className="h-8 w-8 rounded-lg flex items-center justify-center border border-neutral-200 bg-neutral-900 text-white text-[11px] font-semibold hover:bg-neutral-700 transition"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <UserIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{orgName}</span>
            </div>
            <span className="mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              {ROLE_LABEL[role] || role}
            </span>
          </div>
          <Link
            href="/equipe"
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition border-b"
          >
            <Users className="w-4 h-4 text-neutral-400" />
            Gérer l'équipe
          </Link>
          <Link
            href="/facturation"
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition border-b"
          >
            <CreditCard className="w-4 h-4 text-neutral-400" />
            Abonnement
          </Link>
          <button
            onClick={logout}
            disabled={loading}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loading ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      )}
    </div>
  );
}
