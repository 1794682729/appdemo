import { db } from "./client.js";

/** Lightweight bootstrap migrations for single-user MVP. */
export async function migrate() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at VARCHAR(24) NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at VARCHAR(24) NOT NULL,
      created_at VARCHAR(24) NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      type VARCHAR(10) NOT NULL,
      icon VARCHAR(50) NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      created_at VARCHAR(24) NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(10) NOT NULL,
      amount_cents INT NOT NULL,
      category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
      date VARCHAR(10) NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      created_at VARCHAR(24) NOT NULL,
      updated_at VARCHAR(24) NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id VARCHAR(36) PRIMARY KEY,
      \`year_month\` VARCHAR(7) NOT NULL UNIQUE,
      total_cents INT,
      by_category JSON NOT NULL DEFAULT ('{}'),
      updated_at VARCHAR(24) NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value VARCHAR(500) NOT NULL
    );
  `);
  // MySQL doesn't support CREATE INDEX IF NOT EXISTS
  for (const sql of [
    `CREATE INDEX idx_transactions_date ON transactions(\`date\`)`,
    `CREATE INDEX idx_transactions_category ON transactions(category_id)`,
    `CREATE INDEX idx_sessions_user ON sessions(user_id)`,
  ]) {
    try { await db.execute(sql); } catch { /* index already exists */ }
  }
}
