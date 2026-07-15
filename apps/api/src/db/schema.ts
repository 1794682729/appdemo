import { mysqlTable, varchar, int, json, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 10 }).notNull().default("user"), // admin | user
  createdAt: varchar("created_at", { length: 24 }).notNull(),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: varchar("expires_at", { length: 24 }).notNull(),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
});

export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // expense | income | both
  icon: varchar("icon", { length: 50 }).notNull(),
  sort: int("sort").notNull().default(0),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
});

export const transactions = mysqlTable("transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 10 }).notNull(), // expense | income
  amountCents: int("amount_cents").notNull(),
  categoryId: varchar("category_id", { length: 36 })
    .notNull()
    .references(() => categories.id),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  note: varchar("note", { length: 500 }).notNull().default(""),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
  updatedAt: varchar("updated_at", { length: 24 }).notNull(),
});

export const budgets = mysqlTable("budgets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  yearMonth: varchar("year_month", { length: 7 }).notNull(),
  totalCents: int("total_cents"),
  byCategory: json("by_category").notNull().default("{}"), // { categoryId: cents }
  updatedAt: varchar("updated_at", { length: 24 }).notNull(),
}, (table) => ({
  uniqueUserYearMonth: uniqueIndex("uq_user_yearmonth").on(table.userId, table.yearMonth),
}));

export const meta = mysqlTable("meta", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: varchar("value", { length: 500 }).notNull(),
  userId: varchar("user_id", { length: 36 })
    .references(() => users.id, { onDelete: "cascade" }),
});
