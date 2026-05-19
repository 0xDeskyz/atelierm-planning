import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/restore/all — liste tous les backups disponibles, groupés par semaine
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("planner_state_backup")
      .select("id, key, created_at, data")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    const byWeek: Record<string, any[]> = {};
    for (const row of data || []) {
      if (!byWeek[row.key]) byWeek[row.key] = [];
      byWeek[row.key].push({
        id: row.id,
        createdAt: row.created_at,
        people: Array.isArray(row.data?.people) ? row.data.people.length : 0,
        sites: Array.isArray(row.data?.sites) ? row.data.sites.length : 0,
        assignments: Array.isArray(row.data?.assignments) ? row.data.assignments.length : 0,
        quotes: Array.isArray(row.data?.quotes) ? row.data.quotes.length : 0,
      });
    }

    return Response.json({ ok: true, byWeek });
  } catch {
    return Response.json({ ok: false, error: "Restore ALL failed" }, { status: 500 });
  }
}
