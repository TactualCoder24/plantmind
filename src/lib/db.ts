import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DB } from "@/lib/types";

const PRIMARY_PATH = path.join(process.cwd(), "data", "db.json");
const FALLBACK_PATH = path.join("/tmp", "plantmind-db.json");
const STATE_BUCKET = "plantmind-state";
const STATE_KEY = "db.json";

function emptyDB(): DB {
  return { documents: [], chunks: [], graph: { nodes: [], edges: [] }, feedback: [], auditLog: [], complianceFollowups: [] };
}

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

let bucketEnsured = false;
async function ensureStateBucket(client: SupabaseClient): Promise<void> {
  if (bucketEnsured) return;
  try {
    await client.storage.createBucket(STATE_BUCKET, { public: false });
  } catch {
    // Already exists (the common case after the first call) — nothing to do. Any other real
    // problem (bad credentials, network) will surface on the actual read/write call below.
  }
  bucketEnsured = true;
}

function resolveLocalPath(): string {
  try {
    fs.mkdirSync(path.dirname(PRIMARY_PATH), { recursive: true });
    return PRIMARY_PATH;
  } catch {
    return FALLBACK_PATH;
  }
}

function readLocal(): DB {
  const p = resolveLocalPath();
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as DB;
  } catch {
    return emptyDB();
  }
}

function writeLocal(db: DB): void {
  const p = resolveLocalPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * Local JSON-file storage (data/db.json, falling back to /tmp) works fine for local dev, where
 * the Node process stays alive and disk writes persist across requests. It silently breaks once
 * deployed to Vercel (or any serverless host): those functions run in ephemeral containers with a
 * read-only filesystem outside /tmp, and /tmp itself isn't guaranteed to survive between
 * invocations or be shared across concurrent instances — a write from one request can simply be
 * gone before the next request reads it. That's exactly what "seed says it worked, but the chat
 * page shows 0 retrieved sources" means: the seed and the query landed on different, unrelated
 * ephemeral filesystems.
 *
 * So whenever Supabase is configured, the whole DB is persisted as a single JSON blob in Supabase
 * Storage instead — an actual persistent store shared across every invocation. Falls back to
 * local fs only when Supabase isn't configured, so local dev with zero external setup still works
 * exactly as before.
 */
export async function readDB(): Promise<DB> {
  const client = getClient();
  if (!client) return readLocal();

  try {
    await ensureStateBucket(client);
    const { data, error } = await client.storage.from(STATE_BUCKET).download(STATE_KEY);
    if (error) throw error;
    const text = await data.text();
    return JSON.parse(text) as DB;
  } catch {
    return emptyDB();
  }
}

export async function writeDB(db: DB): Promise<void> {
  const client = getClient();
  if (!client) return writeLocal(db);

  await ensureStateBucket(client);
  const blob = new Blob([JSON.stringify(db)], { type: "application/json" });
  const { error } = await client.storage.from(STATE_BUCKET).upload(STATE_KEY, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw error;
}

export async function resetDB(): Promise<DB> {
  const db = emptyDB();
  await writeDB(db);
  return db;
}
