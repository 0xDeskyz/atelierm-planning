import { list, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type PlannerState = Record<string, unknown> | null;

function safeKey(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function localStatePath(key: string) {
  return path.join(process.cwd(), ".data", "planner", `${safeKey(key)}.json`);
}

async function readLocalFallback(key: string): Promise<PlannerState> {
  try {
    const file = localStatePath(key);
    const txt = await readFile(file, "utf-8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function writeLocalFallback(key: string, body: unknown) {
  const file = localStatePath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(body), "utf-8");
}

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const pathname = `planner/${params.key}.json`; // ex: planner/2025-W45.json

  try {
    const entries = await list({ prefix: pathname, limit: 1 });
    const blob = entries.blobs.find((b) => b.pathname === pathname);
    if (blob) {
      const res = await fetch(blob.url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        return Response.json(json);
      }
    }
  } catch {
    // fallback local below
  }

  const local = await readLocalFallback(params.key);
  return Response.json(local);
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const body = await req.json(); // { people, sites, assignments, notes, absencesByWeek }
  const pathname = `planner/${params.key}.json`;

  let blobOk = false;
  try {
    await put(pathname, JSON.stringify(body), {
      access: "public",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false, // nom stable par semaine
    });
    blobOk = true;
  } catch {
    // fallback local below
  }

  try {
    await writeLocalFallback(params.key, body);
  } catch {
    if (!blobOk) {
      return Response.json({ ok: false, error: "Unable to persist state" }, { status: 500 });
    }
  }

  return Response.json({ ok: true, storage: blobOk ? "blob+local" : "local" });
}
