import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    const { data, error } = await supabase
      .from("planner_state")
      .select("data")
      .eq("key", params.key)
      .single();

    if (error || !data) {
      console.log(`[GET ${params.key}] no data — error:`, error?.message);
      return Response.json(null, { headers: { "x-state-storage": "none" } });
    }

    const payload = data.data;
    const siteSample = Array.isArray(payload?.sites) ? payload.sites.slice(0, 3).map((s: any) => ({ id: s?.id, cat: s?.categoriePrincipale })) : "no sites";
    console.log(`[GET ${params.key}] sites:${Array.isArray(payload?.sites) ? payload.sites.length : '?'} updatedAt:${payload?.updatedAt} sample:`, JSON.stringify(siteSample));

    return Response.json(payload, { headers: { "x-state-storage": "supabase" } });
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
    // force:true bypasses this check (used by the restore tool)
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
        // Keep only the 20 most recent snapshots per week key
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

    const siteSample = Array.isArray(body?.sites) ? body.sites.slice(0, 3).map((s: any) => ({ id: s?.id, cat: s?.categoriePrincipale })) : "no sites";
    console.log(`[PUT ${params.key}] sites:${Array.isArray(body?.sites) ? body.sites.length : '?'} updatedAt:${body?.updatedAt} sample:`, JSON.stringify(siteSample));

    const { error } = await supabase
      .from("planner_state")
      .upsert({ key: params.key, data: body, updated_at: new Date().toISOString() });

    if (error) {
      console.error(`[PUT ${params.key}] upsert error:`, error.message);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[PUT ${params.key}] upsert ok — backup:${backupStatus}`);
    return Response.json({ ok: true, storage: "supabase", backupStatus }, { headers: { "x-state-storage": "supabase" } });
  } catch {
    return Response.json({ ok: false, error: "State PUT failed" }, { status: 500 });
  }
}
