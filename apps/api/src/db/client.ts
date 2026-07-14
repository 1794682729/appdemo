import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

const databasePath = process.env.DATABASE_PATH ?? "./data/liushui.db";

mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite, databasePath };

/** Thin wrapper so route files don't need to change transaction API per drizzle version */
export function tx<T>(fn: () => T): T {
  return db.transaction(fn);
}
