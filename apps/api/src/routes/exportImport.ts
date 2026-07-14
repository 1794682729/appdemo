import { Hono } from "hono";
import { db, tx } from "../db/client.js";
import { categories, transactions, budgets, meta } from "../db/schema.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { nowIso } from "../lib/time.js";

export const exportImportRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/export", (c) => {
    const data = {
      exportedAt: nowIso(),
      version: 1,
      categories: db.select().from(categories).all(),
      transactions: db.select().from(transactions).all(),
      budgets: db.select().from(budgets).all(),
      meta: db.select().from(meta).all(),
    };

    return c.json(data);
  })
  .post("/import", async (c) => {
    const body = await c.req.json();

    if (!body.categories || !body.transactions) {
      return c.json({ error: "导入数据格式不正确，需包含 categories 和 transactions" }, 400);
    }

    const overwrite =
      c.req.query("overwrite") !== "false"; // default true

    try {
      tx(() => {
        if (overwrite) {
          db.delete(transactions).run();
          db.delete(categories).run();
          db.delete(budgets).run();
          db.delete(meta).run();
        }

        for (const cat of body.categories ?? []) {
          db.insert(categories)
            .values({
              id: cat.id,
              name: cat.name,
              type: cat.type,
              icon: cat.icon ?? "📦",
              sort: cat.sort ?? 0,
              createdAt: cat.createdAt ?? nowIso(),
            })
            .onConflictDoNothing()
            .run();
        }

        for (const tx of body.transactions ?? []) {
          db.insert(transactions)
            .values({
              id: tx.id,
              type: tx.type,
              amountCents: tx.amountCents,
              categoryId: tx.categoryId,
              date: tx.date,
              note: tx.note ?? "",
              createdAt: tx.createdAt ?? nowIso(),
              updatedAt: tx.updatedAt ?? nowIso(),
            })
            .onConflictDoNothing()
            .run();
        }

        for (const b of body.budgets ?? []) {
          db.insert(budgets)
            .values({
              id: b.id,
              yearMonth: b.yearMonth,
              totalCents: b.totalCents,
              byCategory: b.byCategory ?? "{}",
              updatedAt: b.updatedAt ?? nowIso(),
            })
            .onConflictDoNothing()
            .run();
        }

        for (const m of body.meta ?? []) {
          db.insert(meta)
            .values({ key: m.key, value: m.value })
            .onConflictDoNothing()
            .run();
        }
      });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "导入失败" },
        500,
      );
    }

    return c.json({ ok: true });
  });
