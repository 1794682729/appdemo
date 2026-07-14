import { db } from "./client.js";

/** Lightweight bootstrap migrations for single-user MVP. */
export async function migrate() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  await db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      year_month TEXT NOT NULL UNIQUE,
      total_cents INTEGER,
      by_category TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
  `);
  await db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);`);
}
