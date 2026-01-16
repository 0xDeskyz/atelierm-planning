import { list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  try {
    const pathname = `planner/${params.key}.json`; // ex: planner/2025-W45.json
    const entries = await list({ prefix: pathname, limit: 1 });

    const blob = entries.blobs.find((b) => b.pathname === pathname);
    if (!blob) return Response.json(null, { headers: { "Cache-Control": "no-store" } });

    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: "Blob fetch failed", status: res.status },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    const json = await res.json();
    return Response.json(json, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unexpected error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  try {
    const body = await req.json(); // { people, sites, assignments, notes, absencesByWeek }
    const pathname = `planner/${params.key}.json`;
    const incomingUpdatedAt = Number(body?.updatedAt || 0);

    if (incomingUpdatedAt) {
      const entries = await list({ prefix: pathname, limit: 1 });
      const existing = entries.blobs.find((b) => b.pathname === pathname);
      if (existing) {
        const existingRes = await fetch(existing.url, { cache: "no-store" });
        if (existingRes.ok) {
          const existingJson = await existingRes.json();
          const existingUpdatedAt = Number(existingJson?.updatedAt || 0);
          if (existingUpdatedAt && existingUpdatedAt > incomingUpdatedAt) {
            return Response.json(
              {
                error: "Version plus récente détectée sur le serveur.",
                serverUpdatedAt: existingUpdatedAt,
              },
              { status: 409, headers: { "Cache-Control": "no-store" } }
            );
          }
        }
      }
    }

    await put(pathname, JSON.stringify(body), {
      access: "public",
      contentType: "application/json; charset=utf-8",
      allowOverwrite: true,
      addRandomSuffix: false, // nom stable par semaine
    });

    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("Blob PUT failed", { key: params.key, message: error?.message, stack: error?.stack });
    return Response.json(
      {
        error: error?.message || "Unexpected error",
        hint: "Vérifiez BLOB_READ_WRITE_TOKEN, quotas Blob et permissions.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
