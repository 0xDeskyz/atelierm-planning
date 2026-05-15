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
      return Response.json(null, { headers: { "x-state-storage": "none" } });
    }

    return Response.json(data.data, { headers: { "x-state-storage": "supabase" } });
  } catch {
    return Response.json({ ok: false, error: "State GET failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  try {
    const body = await req.json();
    const supabase = getSupabase();

    const { data: prevRow } = await supabase
      .from("planner_state")
      .select("data")
      .eq("key", params.key)
      .single();
    const prev = prevRow?.data;

    if (body?.force !== true && looksEmpty(body) && prev && !looksEmpty(prev)) {
      return Response.json(
        { ok: false, error: "Refused: incoming payload is empty while existing state has data. Pass force:true to override." },
        { status: 409, headers: { "x-state-storage": "refused-empty" } }
      );
    }

    if (prev) {
      try {
        await supabase
          .from("planner_state_backup")
          .insert({ key: params.key, data: prev, created_at: new Date().toISOString() });
      } catch (backupErr) {
        console.warn("Snapshot backup failed (non-blocking)", backupErr);
      }
    }

    const { error } = await supabase
      .from("planner_state")
      .upsert({ key: params.key, data: body, updated_at: new Date().toISOString() });

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, storage: "supabase" }, { headers: { "x-state-storage": "supabase" } });
  } catch {
    return Response.json({ ok: false, error: "State PUT failed" }, { status: 500 });
  }
}
