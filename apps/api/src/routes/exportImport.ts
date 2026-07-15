import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db, tx } from "../db/client.js";
import { categories, transactions, budgets, meta } from "../db/schema.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { nowIso } from "../lib/time.js";

export const exportImportRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/export", async (c) => {
    const data = {
      exportedAt: nowIso(), version: 1,
      categories: await db.select().from(categories),
      transactions: await db.select().from(transactions),
      budgets: await db.select().from(budgets),
      meta: await db.select().from(meta),
    };
    return c.json(data);
  })
  .post("/import", async (c) => {
    const body = await c.req.json();
    if (!body.categories || !body.transactions) {
      return c.json({ error: "导入数据格式不正确" }, 400);
    }
    const overwrite = c.req.query("overwrite") !== "false";
    try {
      await tx(async () => {
        if (overwrite) {
          await db.delete(transactions);
          await db.delete(categories);
          await db.delete(budgets);
          await db.delete(meta);
        }
        for (const cat of body.categories ?? []) {
          await db.insert(categories).values({ id: cat.id, name: cat.name, type: cat.type, icon: cat.icon ?? "📦", sort: cat.sort ?? 0, createdAt: cat.createdAt ?? nowIso() }).onDuplicateKeyUpdate({ set: { name: sql`name` } });
        }
        for (const t of body.transactions ?? []) {
          await db.insert(transactions).values({ id: t.id, type: t.type, amountCents: t.amountCents, categoryId: t.categoryId, date: t.date, note: t.note ?? "", createdAt: t.createdAt ?? nowIso(), updatedAt: t.updatedAt ?? nowIso() }).onDuplicateKeyUpdate({ set: { updatedAt: sql`updated_at` } });
        }
        for (const b of body.budgets ?? []) {
          await db.insert(budgets).values({ id: b.id, yearMonth: b.yearMonth, totalCents: b.totalCents, byCategory: typeof b.byCategory === "string" ? b.byCategory : (b.byCategory ?? {}), updatedAt: b.updatedAt ?? nowIso() }).onDuplicateKeyUpdate({ set: { updatedAt: sql`updated_at` } });
        }
        for (const m of body.meta ?? []) {
          await db.insert(meta).values({ key: m.key, value: m.value }).onDuplicateKeyUpdate({ set: { value: sql`value` } });
        }
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "导入失败" }, 500);
    }
    return c.json({ ok: true });
  });
