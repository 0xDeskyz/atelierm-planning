"use client";
import { useEffect, useState } from "react";

type Snapshot = {
  id: string;
  createdAt: string;
  people: number;
  sites: number;
  assignments: number;
  quotes: number;
};

export default function RestorePage() {
  const [byWeek, setByWeek] = useState<Record<string, Snapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/restore/all")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setByWeek(d.byWeek); })
      .finally(() => setLoading(false));
  }, []);

  async function restore(weekKey: string, snapshotId: string) {
    setRestoring(snapshotId);
    setMessage(null);
    try {
      const res = await fetch(`/api/restore/${weekKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: snapshotId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: `✅ Semaine ${weekKey} restaurée avec succès.`, ok: true });
      } else {
        setMessage({ text: `❌ Erreur : ${data.error}`, ok: false });
      }
    } catch {
      setMessage({ text: "❌ Erreur réseau", ok: false });
    } finally {
      setRestoring(null);
    }
  }

  const weeks = Object.keys(byWeek).sort().reverse();

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Restauration des données</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Choisissez le snapshot à restaurer pour chaque semaine. Le dernier backup listé est le plus récent.
      </p>

      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 20,
          background: message.ok ? "#d1fae5" : "#fee2e2",
          color: message.ok ? "#065f46" : "#991b1b",
          fontWeight: 600,
        }}>
          {message.text}
        </div>
      )}

      {loading && <p>Chargement des backups…</p>}

      {!loading && weeks.length === 0 && (
        <div style={{ padding: 24, background: "#fef3c7", borderRadius: 8, color: "#92400e" }}>
          <strong>Aucun backup trouvé.</strong> La table <code>planner_state_backup</code> est vide ou n'existe pas encore dans Supabase.
        </div>
      )}

      {weeks.map((weekKey) => (
        <div key={weekKey} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
            {weekKey}
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "8px 12px" }}>Date du backup</th>
                <th style={{ padding: "8px 12px" }}>Personnes</th>
                <th style={{ padding: "8px 12px" }}>Chantiers</th>
                <th style={{ padding: "8px 12px" }}>Affectations</th>
                <th style={{ padding: "8px 12px" }}>Devis</th>
                <th style={{ padding: "8px 12px" }}></th>
              </tr>
            </thead>
            <tbody>
              {byWeek[weekKey].map((snap, i) => (
                <tr key={snap.id} style={{ borderBottom: "1px solid #e2e8f0", background: i === 0 ? "#f0fdf4" : "white" }}>
                  <td style={{ padding: "8px 12px" }}>
                    {new Date(snap.createdAt).toLocaleString("fr-FR")}
                    {i === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "#16a34a", fontWeight: 700 }}>← plus récent</span>}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{snap.people}</td>
                  <td style={{ padding: "8px 12px" }}>{snap.sites}</td>
                  <td style={{ padding: "8px 12px" }}>{snap.assignments}</td>
                  <td style={{ padding: "8px 12px" }}>{snap.quotes}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <button
                      onClick={() => restore(weekKey, snap.id)}
                      disabled={restoring === snap.id}
                      style={{
                        padding: "6px 14px", borderRadius: 6, border: "none",
                        background: restoring === snap.id ? "#94a3b8" : "#2563eb",
                        color: "white", cursor: restoring === snap.id ? "default" : "pointer",
                        fontWeight: 600, fontSize: 13,
                      }}
                    >
                      {restoring === snap.id ? "En cours…" : "Restaurer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
