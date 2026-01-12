import { list, put } from "@vercel/blob";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const pathname = `planner/${params.key}.json`; // ex: planner/2025-W45.json
  const entries = await list({ prefix: pathname, limit: 1 });

  const blob = entries.blobs.find((b) => b.pathname === pathname);
  if (!blob) return Response.json(null);

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return new Response("Blob fetch failed", { status: 500 });
  const json = await res.json();
  return Response.json(json);
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const body = await req.json(); // { people, sites, assignments, notes, absencesByWeek }
  const pathname = `planner/${params.key}.json`;

  await put(pathname, JSON.stringify(body), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false, // nom stable par semaine
  });

  return Response.json({ ok: true });
}
