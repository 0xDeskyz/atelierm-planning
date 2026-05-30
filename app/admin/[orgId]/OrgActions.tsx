"use client";

import { useState } from "react";
import { changePlan, extendTrial, toggleSuspend, deleteOrg } from "../actions";

export default function OrgActions({
  orgId,
  orgName,
  plan,
  suspended,
}: {
  orgId: string;
  orgName: string;
  plan: string;
  suspended: boolean;
}) {
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName.trim() === orgName.trim();

  return (
    <div className="mt-6 space-y-4">
      {/* Forfait */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">Changer le forfait</h2>
        <p className="mt-1 text-xs text-neutral-400">Geste commercial ou correction manuelle.</p>
        <form action={changePlan} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <select name="plan" defaultValue={plan} className="rounded-lg border px-3 py-2 text-sm">
            <option value="trial">Trial</option>
            <option value="starter">Starter (49€)</option>
            <option value="pro">Pro (99€)</option>
          </select>
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">
            Appliquer
          </button>
        </form>
      </div>

      {/* Trial */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">Prolonger l'essai</h2>
        <p className="mt-1 text-xs text-neutral-400">Repart de maintenant et repasse l'org en trial.</p>
        <form action={extendTrial} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <select name="days" defaultValue="14" className="rounded-lg border px-3 py-2 text-sm">
            <option value="7">+7 jours</option>
            <option value="14">+14 jours</option>
            <option value="30">+30 jours</option>
            <option value="60">+60 jours</option>
          </select>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            Prolonger
          </button>
        </form>
      </div>

      {/* Suspension */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">
          {suspended ? "Réactiver l'accès" : "Suspendre l'accès"}
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          {suspended
            ? "L'org pourra de nouveau accéder au planning."
            : "Coupe l'accès au planning sans rien supprimer (impayé, abus)."}
        </p>
        <form action={toggleSuspend} className="mt-3">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              suspended ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            {suspended ? "Réactiver" : "Suspendre"}
          </button>
        </form>
      </div>

      {/* Suppression */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-red-700">Zone dangereuse</h2>
        <p className="mt-1 text-xs text-red-500">
          Supprime définitivement l'org, ses membres, ses invitations et son planning. Irréversible.
          Tape le nom exact <strong>{orgName}</strong> pour confirmer.
        </p>
        <form action={deleteOrg} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <input
            name="confirmName"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={orgName}
            className="flex-1 min-w-[180px] rounded-lg border border-red-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
          />
          <button
            disabled={!canDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Supprimer
          </button>
        </form>
      </div>
    </div>
  );
}
