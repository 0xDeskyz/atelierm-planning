import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Returns the most recently saved planner_state row (excluding planner-main itself).
// Used as migration fallback when planner-main doesn't exist yet.
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("planner_state")
      .select("key, data, updated_at")
      .neq("key", "planner-main")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return Response.json(null, { headers: { "x-state-storage": "none" } });
    }

    return Response.json(data.data, {
      headers: { "x-state-storage": "legacy", "x-legacy-key": data.key },
    });
  } catch {
    return Response.json(null, { status: 200, headers: { "x-state-storage": "error" } });
  }
}
