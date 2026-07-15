import { db } from "./client.js";

/** Lightweight bootstrap migrations. Adds columns if missing for upgrades.
 *
 * UPGRADE NOTE (single-user v1 → multi-user v2):
 * ALTER TABLE adds user_id columns with DEFAULT ''. Existing rows will have
 * empty-string user_id and become invisible to all users. If you have old
 * data, first create an admin account, then manually reassign:
 *   SET @admin = '<admin-user-id>';
 *   UPDATE transactions SET user_id = @admin WHERE user_id = '';
 *   UPDATE categories  SET user_id = @admin WHERE user_id = '';
 *   UPDATE budgets     SET user_id = @admin WHERE user_id = '';
 *   UPDATE meta        SET user_id = @admin WHERE user_id = '';
 */
export async function migrate() {
  // Users
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'user',
      created_at VARCHAR(24) NOT NULL
    );
  `);
  // Add role column for fresh installs that missed it
  try { await db.execute(`ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user';`); } catch { /* exists */ }

  // Sessions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at VARCHAR(24) NOT NULL,
      created_at VARCHAR(24) NOT NULL
    );
  `);

  // Categories
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      type VARCHAR(10) NOT NULL,
      icon VARCHAR(50) NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      created_at VARCHAR(24) NOT NULL
    );
  `);
  try { await db.execute(`ALTER TABLE categories ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT '';`); } catch { /* exists */ }

  // Transactions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(10) NOT NULL,
      amount_cents INT NOT NULL,
      category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
      date VARCHAR(10) NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      created_at VARCHAR(24) NOT NULL,
      updated_at VARCHAR(24) NOT NULL
    );
  `);
  try { await db.execute(`ALTER TABLE transactions ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT '';`); } catch { /* exists */ }

  // Budgets
  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      \`year_month\` VARCHAR(7) NOT NULL,
      total_cents INT,
      by_category JSON NOT NULL DEFAULT ('{}'),
      updated_at VARCHAR(24) NOT NULL
    );
  `);
  try { await db.execute(`ALTER TABLE budgets ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT '';`); } catch { /* exists */ }
  // Composite unique: one budget per user per month
  try { await db.execute(`ALTER TABLE budgets DROP INDEX \`year_month\`;`); } catch { /* no old unique */ }
  try { await db.execute(`ALTER TABLE budgets ADD UNIQUE INDEX uq_user_yearmonth (user_id, \`year_month\`);`); } catch { /* exists */ }

  // Meta
  await db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value VARCHAR(500) NOT NULL,
      user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  try { await db.execute(`ALTER TABLE meta ADD COLUMN user_id VARCHAR(36);`); } catch { /* exists */ }

  // API tokens (for iOS Shortcuts / webhook)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      label VARCHAR(100),
      last_used_at VARCHAR(24),
      created_at VARCHAR(24) NOT NULL
    );
  `);

  // Indexes
  for (const sql of [
    `CREATE INDEX idx_transactions_date ON transactions(\`date\`)`,
    `CREATE INDEX idx_transactions_category ON transactions(category_id)`,
    `CREATE INDEX idx_sessions_user ON sessions(user_id)`,
    `CREATE INDEX idx_transactions_user ON transactions(user_id)`,
    `CREATE INDEX idx_categories_user ON categories(user_id)`,
    `CREATE INDEX idx_budgets_user ON budgets(user_id)`,
  ]) {
    try { await db.execute(sql); } catch { /* index already exists */ }
  }
}
