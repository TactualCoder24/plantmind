import fs from "fs";
import path from "path";
import { DB } from "@/lib/types";

const PRIMARY_PATH = path.join(process.cwd(), "data", "db.json");
const FALLBACK_PATH = path.join("/tmp", "plantmind-db.json");

function emptyDB(): DB {
  return { documents: [], chunks: [], graph: { nodes: [], edges: [] }, feedback: [] };
}

function resolvePath(): string {
  try {
    fs.mkdirSync(path.dirname(PRIMARY_PATH), { recursive: true });
    return PRIMARY_PATH;
  } catch {
    return FALLBACK_PATH;
  }
}

export function readDB(): DB {
  const p = resolvePath();
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as DB;
  } catch {
    return emptyDB();
  }
}

export function writeDB(db: DB): void {
  const p = resolvePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(db, null, 2), "utf-8");
}

export function resetDB(): DB {
  const db = emptyDB();
  writeDB(db);
  return db;
}
