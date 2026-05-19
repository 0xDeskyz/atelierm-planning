import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/restore/[key] — liste les 20 derniers backups pour cette semaine
export async function GET(_req: Request, { params }: { params: { key: string } }) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("planner_state_backup")
      .select("id, key, created_at, data")
      .eq("key", params.key)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    const snapshots = (data || []).map((row: any) => ({
      id: row.id,
      key: row.key,
      createdAt: row.created_at,
      people: Array.isArray(row.data?.people) ? row.data.people.length : 0,
      sites: Array.isArray(row.data?.sites) ? row.data.sites.length : 0,
      assignments: Array.isArray(row.data?.assignments) ? row.data.assignments.length : 0,
      quotes: Array.isArray(row.data?.quotes) ? row.data.quotes.length : 0,
    }));

    return Response.json({ ok: true, snapshots });
  } catch {
    return Response.json({ ok: false, error: "Restore GET failed" }, { status: 500 });
  }
}

// POST /api/restore/[key] — restaure le backup avec l'id donné dans body { id }
export async function POST(req: Request, { params }: { params: { key: string } }) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ ok: false, error: "id manquant" }, { status: 400 });

    const supabase = getSupabase();
    const { data: backup, error: fetchErr } = await supabase
      .from("planner_state_backup")
      .select("data")
      .eq("id", id)
      .eq("key", params.key)
      .single();

    if (fetchErr || !backup) {
      return Response.json({ ok: false, error: "Backup introuvable" }, { status: 404 });
    }

    const restored = { ...backup.data, updatedAt: Date.now(), restoredAt: new Date().toISOString() };

    const { error: saveErr } = await supabase
      .from("planner_state")
      .upsert({ key: params.key, data: restored, updated_at: new Date().toISOString() });

    if (saveErr) {
      return Response.json({ ok: false, error: saveErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, data: restored });
  } catch {
    return Response.json({ ok: false, error: "Restore POST failed" }, { status: 500 });
  }
}
