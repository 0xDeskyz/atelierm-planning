import { list, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type PlannerState = Record<string, unknown> | null;

declare global {
  // eslint-disable-next-line no-var
  var __plannerStateMemoryFallback: Map<string, PlannerState> | undefined;
}

function memoryFallbackStore() {
  if (!globalThis.__plannerStateMemoryFallback) {
    globalThis.__plannerStateMemoryFallback = new Map<string, PlannerState>();
  }
  return globalThis.__plannerStateMemoryFallback;
}

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
        return Response.json(json, { headers: { "x-state-storage": "blob" } });
      }
    }
  } catch {
    // fallback below
  }

  const local = await readLocalFallback(params.key);
  if (local) {
    return Response.json(local, { headers: { "x-state-storage": "local" } });
  }

  const memory = memoryFallbackStore().get(params.key) ?? null;
  return Response.json(memory, { headers: { "x-state-storage": memory ? "memory" : "none" } });
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
    // fallback below
  }

  let localOk = false;
  try {
    await writeLocalFallback(params.key, body);
    localOk = true;
  } catch {
    // fallback below
  }

  if (!blobOk && !localOk) {
    memoryFallbackStore().set(params.key, body as PlannerState);
    return Response.json(
      { ok: true, storage: "memory", warning: "Blob and local fs unavailable; using in-memory fallback" },
      { headers: { "x-state-storage": "memory" } }
    );
  }

  const storage = blobOk ? (localOk ? "blob+local" : "blob") : "local";
  return Response.json({ ok: true, storage }, { headers: { "x-state-storage": storage } });
}
