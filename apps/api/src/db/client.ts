import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "liushui",
  waitForConnections: true,
  connectionLimit: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

export const db = drizzle(pool, { schema, mode: "default" });

/** Async transaction wrapper */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
