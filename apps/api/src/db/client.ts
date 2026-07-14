import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const databasePath = process.env.DATABASE_PATH ?? "./data/liushui.db";

const client = createClient({
  url: `file:${databasePath}`,
});

export const db = drizzle(client, { schema });
export { databasePath };

/** Async transaction wrapper */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
