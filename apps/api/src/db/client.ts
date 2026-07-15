import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "liushui",
});

export const db = drizzle(connection, { schema, mode: "default" });

/** Async transaction wrapper */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
