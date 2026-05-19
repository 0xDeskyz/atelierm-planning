import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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
    const incomingVersion = Number(body?.updatedAt || 0);
    const supabase = getSupabase();

    // Reject stale writes: if the server already has a newer version, return 409
    if (incomingVersion > 0) {
      const { data: current } = await supabase
        .from("planner_state")
        .select("data")
        .eq("key", params.key)
        .single();

      const storedVersion = Number(current?.data?.updatedAt || 0);
      if (storedVersion > 0 && incomingVersion < storedVersion) {
        return Response.json(
          { ok: false, conflict: true, storedVersion, incomingVersion },
          { status: 409 }
        );
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
