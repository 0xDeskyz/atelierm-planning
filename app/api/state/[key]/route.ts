import { list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const fetchCache = "force-no-store";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const pathname = `planner/${params.key}.json`; // ex: planner/2025-W45.json
  const entries = await list({ prefix: pathname, limit: 1 });

  const blob = entries.blobs.find((b) => b.pathname === pathname);
  if (!blob) return Response.json(null);

  // Cache-bust the blob URL to avoid any edge caching between writes
  const res = await fetch(`${blob.url}?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
  if (!res.ok) return new Response("Blob fetch failed", { status: 500 });
  const json = await res.json();
  return Response.json(json, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate", // navigateur
      "Pragma": "no-cache",
      "Expires": "0",
      "CDN-Cache-Control": "no-store", // edge Vercel
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
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
