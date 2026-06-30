import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Sauvegarde fiable (app mono-entreprise) : on utilise le client de session
// (clé anon + cookies) — celui qui sert déjà à la connexion, donc toujours
// correctement configuré. Les règles RLS sont permissives (cf. relax_state_rls.sql) :
// tout utilisateur connecté peut lire/écrire. Aucune dépendance au service-role.
// La clé peut être `org-{uuid}` (héritage) ou une clé fixe comme `planner-main`.
function orgIdFromKey(key: string): string | null {
  return key.startsWith("org-") ? key.slice(4) : null;
}

function looksEmpty(payload: any) {
  if (!payload || typeof payload !== "object") return true;
  const people = Array.isArray(payload.people) ? payload.people : [];
  const sites = Array.isArray(payload.sites) ? payload.sites : [];
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
  return people.length === 0 && sites.length === 0 && assignments.length === 0 && quotes.length === 0;
}

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  "Surrogate-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json(null, { status: 401 });

    const { data, error } = await supabase
      .from("planner_state")
      .select("data")
      .eq("key", params.key)
      .maybeSingle();

    if (error || !data) {
      return Response.json(null, { headers: { "x-state-storage": "none", ...NO_CACHE } });
    }
    return Response.json(data.data, { headers: { "x-state-storage": "supabase", ...NO_CACHE } });
  } catch {
    return Response.json({ ok: false, error: "State GET failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const orgId = orgIdFromKey(params.key); // null pour une clé fixe (planner-main)
    const body = await req.json();
    const incomingVersion = Number(body?.updatedAt || 0);

    // prev : empty-guard, backup, et décision INSERT vs UPDATE.
    const { data: prevRow } = await supabase
      .from("planner_state")
      .select("data")
      .eq("key", params.key)
      .maybeSingle();
    const prev = prevRow?.data ?? null;
    const storedVer = Number(prev?.updatedAt || 0);

    // Refuse un payload vide qui écraserait de vraies données
    if (body?.force !== true && looksEmpty(body) && prev && !looksEmpty(prev)) {
      return Response.json(
        { ok: false, error: "Refused: incoming payload is empty while existing state has data." },
        { status: 409, headers: { "x-state-storage": "refused-empty" } }
      );
    }

    // Conflit de version
    if (prev !== null && body?.force !== true && incomingVersion > 0 && storedVer > incomingVersion) {
      return Response.json(
        { ok: false, conflict: true, storedVersion: storedVer, incomingVersion },
        { status: 409 }
      );
    }

    // Backup du précédent — fire-and-forget
    if (prev) {
      supabase
        .from("planner_state_backup")
        .insert({ key: params.key, org_id: orgId, data: prev })
        .then(({ error: backupErr }) => {
          if (backupErr) return;
          supabase
            .from("planner_state_backup")
            .select("id")
            .eq("key", params.key)
            .order("created_at", { ascending: false })
            .then(({ data: ids }) => {
              if (ids && ids.length > 20) {
                const toDelete = ids.slice(20).map((r: any) => r.id);
                supabase.from("planner_state_backup").delete().in("id", toDelete);
              }
            });
        });
    }

    const ts = new Date().toISOString();
    let writeRows = 0;
    let writeError: string | null = null;
    let writeMethod: string;

    if (prev !== null) {
      writeMethod = "update";
      const { data: updated, error: updateErr } = await supabase
        .from("planner_state")
        .update({ data: body, updated_at: ts })
        .eq("key", params.key)
        .select("key");
      writeRows = updated?.length ?? 0;
      writeError = updateErr?.message ?? null;
    } else {
      writeMethod = "insert";
      const { data: inserted, error: insertErr } = await supabase
        .from("planner_state")
        .insert({ key: params.key, org_id: orgId, data: body, updated_at: ts })
        .select("key");
      writeRows = inserted?.length ?? 0;
      writeError = insertErr?.message ?? null;
    }

    if (writeError) {
      return Response.json({ ok: false, error: writeError, writeMethod }, { status: 500 });
    }
    if (writeRows === 0) {
      return Response.json({ ok: false, error: "Write affected 0 rows", writeMethod }, { status: 500 });
    }

    return Response.json(
      { ok: true, storage: "supabase", writeMethod, writeRows },
      { headers: { "x-state-storage": "supabase" } }
    );
  } catch {
    return Response.json({ ok: false, error: "State PUT failed" }, { status: 500 });
  }
}
