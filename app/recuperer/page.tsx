"use client";
import { useEffect, useState } from "react";

type WeekSnapshot = {
  key: string;
  localKey: string;
  updatedAt: number;
  people: number;
  sites: number;
  assignments: number;
  quotes: number;
  raw: any;
};

export default function RecuperPage() {
  const [snapshots, setSnapshots] = useState<WeekSnapshot[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({});

  useEffect(() => {
    const found: WeekSnapshot[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const localKey = localStorage.key(i);
      if (!localKey?.startsWith("planner-state-")) continue;
      try {
        const raw = JSON.parse(localStorage.getItem(localKey) || "");
        if (!raw || typeof raw !== "object") continue;
        const weekKey = localKey.replace("planner-state-", "");
        found.push({
          key: weekKey,
          localKey,
          updatedAt: Number(raw.updatedAt || 0),
          people: Array.isArray(raw.people) ? raw.people.length : 0,
          sites: Array.isArray(raw.sites) ? raw.sites.length : 0,
          assignments: Array.isArray(raw.assignments) ? raw.assignments.length : 0,
          quotes: Array.isArray(raw.quotes) ? raw.quotes.length : 0,
          raw,
        });
      } catch {}
    }
    found.sort((a, b) => b.key.localeCompare(a.key));
    setSnapshots(found);
  }, []);

  async function restore(snap: WeekSnapshot) {
    setRestoring(snap.key);
    setMessages((m) => ({ ...m, [snap.key]: { text: "Restauration en cours…", ok: true } }));
    try {
      const payload = { ...snap.raw, updatedAt: Date.now(), force: true };
      const res = await fetch(`/api/state/${snap.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessages((m) => ({ ...m, [snap.key]: { text: "✅ Restauré avec succès — rechargez le planning.", ok: true } }));
      } else {
        setMessages((m) => ({ ...m, [snap.key]: { text: `❌ Erreur : ${data.error || res.status}`, ok: false } }));
      }
    } catch {
      setMessages((m) => ({ ...m, [snap.key]: { text: "❌ Erreur réseau", ok: false } }));
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Récupération depuis ce navigateur</h1>
      <p style={{ color: "#666", marginBottom: 8 }}>
        Cette page lit le cache local <strong>de ce navigateur</strong> et vous permet de remettre les données sur le serveur.
      </p>
      <p style={{ color: "#e07000", marginBottom: 24, fontWeight: 600 }}>
        ⚠️ Ouvrez cette page sur le Mac ou le Samsung qui avait les données — pas sur un autre appareil.
      </p>

      {snapshots.length === 0 && (
        <div style={{ padding: 24, background: "#fef3c7", borderRadius: 8, color: "#92400e" }}>
          <strong>Aucune donnée trouvée dans ce navigateur.</strong><br />
          Essayez d'ouvrir cette page sur l'appareil qui avait le planning (Mac ou Samsung).
        </div>
      )}

      {snapshots.map((snap) => (
        <div key={snap.key} style={{ marginBottom: 24, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 16 }}>{snap.key}</strong>
            <span style={{ color: "#64748b", fontSize: 13 }}>
              Sauvegardé le {snap.updatedAt ? new Date(snap.updatedAt).toLocaleString("fr-FR") : "date inconnue"}
            </span>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <span>👷 <strong>{snap.people}</strong> personnes</span>
            <span>🏗️ <strong>{snap.sites}</strong> chantiers</span>
            <span>📋 <strong>{snap.assignments}</strong> affectations</span>
            <span>📄 <strong>{snap.quotes}</strong> devis</span>
            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={() => restore(snap)}
                disabled={restoring === snap.key}
                style={{
                  padding: "8px 18px", borderRadius: 7, border: "none",
                  background: restoring === snap.key ? "#94a3b8" : "#16a34a",
                  color: "white", cursor: restoring === snap.key ? "default" : "pointer",
                  fontWeight: 700, fontSize: 14,
                }}
              >
                {restoring === snap.key ? "En cours…" : "Restaurer sur le serveur"}
              </button>
            </div>
          </div>
          {messages[snap.key] && (
            <div style={{
              padding: "10px 16px",
              background: messages[snap.key].ok ? "#d1fae5" : "#fee2e2",
              color: messages[snap.key].ok ? "#065f46" : "#991b1b",
              fontWeight: 600, fontSize: 13,
            }}>
              {messages[snap.key].text}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
