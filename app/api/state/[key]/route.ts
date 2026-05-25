import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const getSite = Array.isArray(data.data?.sites) ? data.data.sites.find((s: any) => s.id === 's-belmonte') : null;
    console.log(`[GET] key=${params.key} updatedAt=${data.data?.updatedAt} s-belmonte.cat=${getSite?.categoriePrincipale ?? 'MISSING'}`);
    return Response.json(data.data, {
      headers: {
        "x-state-storage": "supabase",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Surrogate-Control": "no-store",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
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
    const incomingSite = Array.isArray(body?.sites) ? body.sites.find((s: any) => s.id === 's-belmonte') : null;
    console.log(`[PUT] key=${params.key} serviceRole=${hasServiceRole} stored=${storedVer} incoming=${incomingVersion} s-belmonte.cat=${incomingSite?.categoriePrincipale ?? 'MISSING'}`);

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

      // Plain UPDATE — select data back immediately to see what Supabase actually stored.
      const { data: updated, error: updateErr } = await supabase
        .from("planner_state")
        .update({ data: body, updated_at: ts })
        .eq("key", params.key)
        .select("key, data");

      writeRows = updated?.length ?? 0;
      writeError = updateErr?.message ?? null;

      // Log what the UPDATE actually returned — if returnedUpdatedAt !== incomingVersion,
      // a Postgres trigger is reverting the data column.
      const returnedRow = updated?.[0];
      const returnedUpdatedAt = Number((returnedRow as any)?.data?.updatedAt || 0);
      const returnedCats = Array.isArray((returnedRow as any)?.data?.sites)
        ? (returnedRow as any).data.sites.filter((s: any) => s?.categoriePrincipale).map((s: any) => `${s.id}=${s.categoriePrincipale}`)
        : [];
      console.log(`[PUT] UPDATE returned: key=${returnedRow?.key} data.updatedAt=${returnedUpdatedAt} (sent=${incomingVersion}) cats=[${returnedCats.join(',')}] writeError=${writeError ?? 'none'}`);
      if (returnedUpdatedAt > 0 && returnedUpdatedAt !== incomingVersion) {
        console.error(`[PUT] TRIGGER REVERT DETECTED — Postgres returned different updatedAt than sent: returned=${returnedUpdatedAt} sent=${incomingVersion}`);
      }

      // Verify the write actually committed — diagnostic only, never blocks the response.
      // Supabase's pgBouncer can return stale data on the verify SELECT (connection lag),
      // so we log the result but do NOT return 500 based on it. The writeRows=1 from the
      // UPDATE itself is our authoritative success signal.
      if (!writeError && writeRows > 0 && incomingVersion > 0) {
        const { data: verify } = await supabase
          .from("planner_state")
          .select("data")
          .eq("key", params.key)
          .maybeSingle();
        const actualUpdatedAt = Number(verify?.data?.updatedAt || 0);
        const incomingSitesWithCat = Array.isArray(body?.sites)
          ? body.sites.filter((s: any) => s?.categoriePrincipale).map((s: any) => `${s.id}=${s.categoriePrincipale}`)
          : [];
        const verifiedSitesWithCat = Array.isArray(verify?.data?.sites)
          ? verify.data.sites.filter((s: any) => s?.categoriePrincipale).map((s: any) => `${s.id}=${s.categoriePrincipale}`)
          : [];
        console.log(`[PUT] verify: actual=${actualUpdatedAt} expected=${incomingVersion} ok=${actualUpdatedAt >= incomingVersion} sent=[${incomingSitesWithCat.join(',')}] stored=[${verifiedSitesWithCat.join(',')}]`);
        if (actualUpdatedAt < incomingVersion) {
          console.warn(`[PUT] verify lag detected (pgBouncer?) — actual=${actualUpdatedAt} < expected=${incomingVersion} — treating as ok since writeRows=${writeRows}`);
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
