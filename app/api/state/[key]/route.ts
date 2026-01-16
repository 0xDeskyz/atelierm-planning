import { list, put } from "@vercel/blob";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  try {
    const pathname = `planner/${params.key}.json`; // ex: planner/2025-W45.json
    const entries = await list({ prefix: pathname, limit: 1 });

    const blob = entries.blobs.find((b) => b.pathname === pathname);
    if (!blob) return Response.json(null);

    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: "Blob fetch failed", status: res.status }, { status: 502 });
    }
    const json = await res.json();
    return Response.json(json);
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  try {
    const body = await req.json(); // { people, sites, assignments, notes, absencesByWeek }
    const pathname = `planner/${params.key}.json`;

    await put(pathname, JSON.stringify(body), {
      access: "public",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false, // nom stable par semaine
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("Blob PUT failed", { key: params.key, message: error?.message, stack: error?.stack });
    return Response.json(
      {
        error: error?.message || "Unexpected error",
        hint: "Vérifiez BLOB_READ_WRITE_TOKEN, quotas Blob et permissions.",
      },
      { status: 500 }
    );
  }
}
