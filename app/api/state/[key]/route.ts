import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    const { data, error } = await supabase
      .from("planner_state")
      .select("data, updated_at")
      .eq("key", params.key)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return Response.json(null, { headers: { "x-state-storage": "none" } });
    }
    return Response.json(data.data, { headers: { "x-state-storage": "supabase", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "State GET failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  try {
    const body = await req.json();
    const incomingVersion = Number(body?.updatedAt || 0);
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = getSupabase();

    // Read prev for: empty-payload guard, backup, and INSERT-vs-UPDATE decision
    const { data: prevRow } = await supabase
      .from("planner_state")
      .select("data")
      .eq("key", params.key)
      .maybeSingle();
    const prev = prevRow?.data ?? null;
    const storedVer = Number(prev?.updatedAt || 0);
    console.log(`[PUT] key=${params.key} serviceRole=${hasServiceRole} stored=${storedVer} incoming=${incomingVersion}`);

    // Refuse empty payloads overwriting real data
    if (body?.force !== true && looksEmpty(body) && prev && !looksEmpty(prev)) {
      return Response.json(
        { ok: false, error: "Refused: incoming payload is empty while existing state has data." },
        { status: 409, headers: { "x-state-storage": "refused-empty" } }
      );
    }

    // Backup previous state — fire-and-forget so it never blocks the main write path.
    if (prev) {
      supabase.from("planner_state_backup").insert({ key: params.key, data: prev }).then(({ error: backupErr }) => {
        if (backupErr) return;
        // Keep only the 20 most-recent backups
        supabase.from("planner_state_backup").select("id").eq("key", params.key)
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

      // Version check in JS — prev was already read above, no extra round-trip needed.
      if (body?.force !== true && incomingVersion > 0) {
        if (storedVer > incomingVersion) {
          return Response.json(
            { ok: false, conflict: true, storedVersion: storedVer, incomingVersion },
            { status: 409 }
          );
        }
      }

      // Plain UPDATE — no JSONB filter in the WHERE clause.
      const { data: updated, error: updateErr } = await supabase
        .from("planner_state")
        .update({ data: body, updated_at: ts })
        .eq("key", params.key)
        .select("key");

      writeRows = updated?.length ?? 0;
      writeError = updateErr?.message ?? null;

      // Verify the write actually committed. Only fail if the DB has an OLDER version
      // than we sent — that means our write was silently reverted. If it has a NEWER
      // version (concurrent write from the autosave debounce with correct data), that
      // is fine: the latest state is still correct.
      if (!writeError && writeRows > 0 && incomingVersion > 0) {
        const { data: verify } = await supabase
          .from("planner_state")
          .select("data")
          .eq("key", params.key)
          .maybeSingle();
        const actualUpdatedAt = Number(verify?.data?.updatedAt || 0);
        console.log(`[PUT] verify: actual=${actualUpdatedAt} expected=${incomingVersion} ok=${actualUpdatedAt >= incomingVersion}`);
        if (actualUpdatedAt < incomingVersion) {
          return Response.json(
            {
              ok: false,
              error: "Write silently rejected by DB",
              actualUpdatedAt,
              incomingVersion,
              usingServiceRole: hasServiceRole,
            },
            { status: 500 }
          );
        }
      }
    } else {
      // INSERT for new keys
      writeMethod = "insert";
      const { data: inserted, error: insertErr } = await supabase
        .from("planner_state")
        .insert({ key: params.key, data: body, updated_at: ts })
        .select("key");
      writeRows = inserted?.length ?? 0;
      writeError = insertErr?.message ?? null;

      if (!writeError && writeRows === 0) {
        writeMethod = "upsert-onconflict";
        const { data: ups, error: upsErr } = await supabase
          .from("planner_state")
          .upsert({ key: params.key, data: body, updated_at: ts }, { onConflict: "key" })
          .select("key");
        writeRows = ups?.length ?? 0;
        writeError = upsErr?.message ?? null;
      }
    }

    if (writeError) {
      return Response.json({ ok: false, error: writeError, writeMethod, writeRows }, { status: 500 });
    }
    if (writeRows === 0) {
      return Response.json({ ok: false, error: "Write affected 0 rows", writeMethod, writeRows }, { status: 500 });
    }

    return Response.json({ ok: true, storage: "supabase", writeMethod, writeRows, usingServiceRole: hasServiceRole }, { headers: { "x-state-storage": "supabase" } });
  } catch {
    return Response.json({ ok: false, error: "State PUT failed" }, { status: 500 });
  }
}
