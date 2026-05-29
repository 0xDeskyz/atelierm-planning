"use client";

import { useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { inviteMember, cancelInvitation, changeRole, removeMember } from "./actions";

type Member = { user_id: string; email: string; role: string };
type Invitation = { id: string; email: string; role: string; token: string };

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Lecture seule",
};

export default function TeamManager({
  members,
  invitations,
  currentUserId,
  isOwner,
}: {
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Inviter */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-neutral-900">Inviter un collègue</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Un lien d'invitation sera généré — copie-le et envoie-le à la personne.
        </p>
        <form action={inviteMember} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="email@collegue.fr"
            className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm"
          />
          <select name="role" defaultValue="member" className="rounded-lg border px-3 py-2 text-sm">
            <option value="member">Lecture seule</option>
            <option value="admin">Administrateur</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Générer l'invitation
          </button>
        </form>
      </section>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900">Invitations en attente</h2>
          <ul className="mt-3 space-y-2">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium text-neutral-800">{inv.email}</span>
                  <span className="ml-2 text-xs text-neutral-500">{ROLE_LABEL[inv.role]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium hover:bg-neutral-50"
                  >
                    {copied === inv.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === inv.token ? "Copié !" : "Copier le lien"}
                  </button>
                  <form action={cancelInvitation}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button type="submit" className="rounded-lg border px-2 py-1 text-xs text-red-500 hover:bg-red-50">
                      Annuler
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Membres */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-neutral-900">Membres ({members.length})</h2>
        <ul className="mt-3 divide-y">
          {members.map((m) => {
            const isSelf = m.user_id === currentUserId;
            const isMemberOwner = m.role === "owner";
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="text-sm">
                  <span className="font-medium text-neutral-800">{m.email}</span>
                  {isSelf && <span className="ml-2 text-xs text-neutral-400">(toi)</span>}
                </div>
                <div className="flex items-center gap-2">
                  {isMemberOwner ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      {ROLE_LABEL.owner}
                    </span>
                  ) : isOwner ? (
                    <>
                      <form action={changeRole}>
                        <input type="hidden" name="userId" value={m.user_id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="rounded-lg border px-2 py-1 text-xs"
                        >
                          <option value="member">Lecture seule</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </form>
                      <form action={removeMember}>
                        <input type="hidden" name="userId" value={m.user_id} />
                        <button type="submit" title="Retirer" className="rounded-lg border p-1.5 text-red-500 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
