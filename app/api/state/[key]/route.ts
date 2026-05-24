import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log("[getSupabase] using key:", serviceKey ? `service_role (${serviceKey.slice(0, 20)}...)` : "anon");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function looksEmpty(payload: any) {
  if (!payload || typeof payload !== "object") return true;
  const people = Array.isArray(payload.people) ? payload.people : [];
  const sites = Array.isArray(payload.sites) ? payload.sites : [];
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
  return people.length === 0 && sites.length === 0 && assignments.length === 0 && quotes.length === 0;
}

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  try {
    const supabase = getSupabase();

    // Compter les lignes pour détecter les doublons
    const { count } = await supabase.from("planner_state").select("*", { count: "exact", head: true }).eq("key", params.key);
    console.log(`[GET ${params.key}] row count: ${count}`);

    const { data, error } = await supabase
      .from("planner_state")
      .select("data, updated_at")
      .eq("key", params.key)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log(`[GET ${params.key}] no data — error:`, error?.message);
      return Response.json(null, { headers: { "x-state-storage": "none" } });
    }

    console.log(`[GET ${params.key}] db updated_at: ${data.updated_at} | data.updatedAt: ${data.data?.updatedAt} | sites: ${data.data?.sites?.length ?? '?'}`);
    return Response.json(data.data, { headers: { "x-state-storage": "supabase" } });
  } catch {
    return Response.json({ ok: false, error: "State GET failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  try {
    const body = await req.json();
    const incomingVersion = Number(body?.updatedAt || 0);
    const supabase = getSupabase();

    const { data: prevRow } = await supabase
      .from("planner_state")
      .select("data")
      .eq("key", params.key)
      .single();
    const prev = prevRow?.data;

    // Refuse empty payloads overwriting real data
    if (body?.force !== true && looksEmpty(body) && prev && !looksEmpty(prev)) {
      return Response.json(
        { ok: false, error: "Refused: incoming payload is empty while existing state has data. Pass force:true to override." },
        { status: 409, headers: { "x-state-storage": "refused-empty" } }
      );
    }

    // Reject stale writes: if the server already has a newer version, return 409
    if (body?.force !== true && incomingVersion > 0 && prev) {
      const storedVersion = Number(prev?.updatedAt || 0);
      if (storedVersion > 0 && incomingVersion < storedVersion) {
        return Response.json(
          { ok: false, conflict: true, storedVersion, incomingVersion },
          { status: 409 }
        );
      }
    }

    let backupStatus: string = "skipped (no prev)";
    if (prev) {
      const { error: backupErr } = await supabase
        .from("planner_state_backup")
        .insert({ key: params.key, data: prev });
      if (backupErr) {
        backupStatus = `error: ${backupErr.message}`;
        console.warn("Snapshot backup failed (non-blocking):", backupErr.message);
      } else {
        backupStatus = "ok";
        const { data: ids } = await supabase
          .from("planner_state_backup")
          .select("id")
          .eq("key", params.key)
          .order("created_at", { ascending: false });
        if (ids && ids.length > 20) {
          const toDelete = ids.slice(20).map((r: any) => r.id);
          await supabase.from("planner_state_backup").delete().in("id", toDelete);
        }
      }
    }

    const ts = new Date().toISOString();
    let writeRows = 0;
    let writeError: string | null = null;

    if (prev) {
      // UPDATE explicite (plus fiable que upsert quand key n'est pas le PK)
      const { data: updated, error: updateErr } = await supabase
        .from("planner_state")
        .update({ data: body, updated_at: ts })
        .eq("key", params.key)
        .select("key");
      writeRows = updated?.length ?? 0;
      writeError = updateErr?.message ?? null;
    } else {
      // INSERT pour les nouvelles clés
      const { data: inserted, error: insertErr } = await supabase
        .from("planner_state")
        .insert({ key: params.key, data: body, updated_at: ts })
        .select("key");
      writeRows = inserted?.length ?? 0;
      writeError = insertErr?.message ?? null;
    }

    console.log(`[PUT ${params.key}] ${prev ? "update" : "insert"} — rows:${writeRows} error:${writeError ?? "none"} updatedAt_sent:${body?.updatedAt} sites_sent:${body?.sites?.length ?? '?'}`);

    if (writeError) {
      return Response.json({ ok: false, error: writeError }, { status: 500 });
    }
    if (writeRows === 0) {
      // Fallback : upsert avec onConflict si l'update retourne 0 lignes
      const { data: ups, error: upsErr } = await supabase
        .from("planner_state")
        .upsert({ key: params.key, data: body, updated_at: ts }, { onConflict: "key" })
        .select("key");
      console.log(`[PUT ${params.key}] upsert fallback — rows:${ups?.length ?? 0} error:${upsErr?.message ?? "none"}`);
      if (upsErr) return Response.json({ ok: false, error: upsErr.message }, { status: 500 });
      if (!ups || ups.length === 0) return Response.json({ ok: false, error: "Write affected 0 rows" }, { status: 500 });
    }

    return Response.json({ ok: true, storage: "supabase", backupStatus }, { headers: { "x-state-storage": "supabase" } });
  } catch {
    return Response.json({ ok: false, error: "State PUT failed" }, { status: 500 });
  }
}
