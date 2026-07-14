import { Hono } from "hono";
import { eq, count } from "drizzle-orm";
import { categoryCreateSchema, categoryUpdateSchema } from "@liushui/shared";
import { db, tx } from "../db/client.js";
import { categories, transactions } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const SEED_CATEGORIES = [
  { name: "餐饮", type: "expense" as const, icon: "🍚", sort: 10 },
  { name: "交通", type: "expense" as const, icon: "🚗", sort: 20 },
  { name: "购物", type: "expense" as const, icon: "🛒", sort: 30 },
  { name: "住房", type: "expense" as const, icon: "🏠", sort: 40 },
  { name: "娱乐", type: "expense" as const, icon: "🎮", sort: 50 },
  { name: "医疗", type: "expense" as const, icon: "💊", sort: 60 },
  { name: "日用品", type: "expense" as const, icon: "📦", sort: 70 },
  { name: "工资", type: "income" as const, icon: "💰", sort: 10 },
  { name: "其他收入", type: "income" as const, icon: "📥", sort: 90 },
  { name: "其他支出", type: "expense" as const, icon: "💸", sort: 99 },
];

function seedIfEmpty() {
  const [row] = db
    .select({ count: count() })
    .from(categories)
    .all();
  if ((row.count as number) > 0) return;

  const now = nowIso();
  for (const c of SEED_CATEGORIES) {
    db.insert(categories).values({
      id: newId("cat"),
      name: c.name,
      type: c.type,
      icon: c.icon,
      sort: c.sort,
      createdAt: now,
    }).run();
  }
}

export const categoriesRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/categories", (c) => {
    seedIfEmpty();
    const rows = db
      .select()
      .from(categories)
      .all();
    return c.json(rows);
  })
  .post("/categories", async (c) => {
    const body = await c.req.json();
    const parsed = categoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const row = {
      id: newId("cat"),
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon,
      sort: parsed.data.sort ?? 0,
      createdAt: nowIso(),
    };

    db.insert(categories).values(row).run();
    return c.json(row, 201);
  })
  .patch("/categories/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const existing = db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .get();
    if (!existing) {
      return c.json({ error: "分类不存在" }, 404);
    }

    const updates = { ...parsed.data };
    db.update(categories).set(updates).where(eq(categories.id, id)).run();

    return c.json({ ...existing, ...updates });
  })
  .delete("/categories/:id", (c) => {
    const id = c.req.param("id");
    const existing = db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .get();
    if (!existing) {
      return c.json({ error: "分类不存在" }, 404);
    }

    // Reassign transactions using this category
    tx(() => {
      db.update(transactions)
        .set({ categoryId: "" })
        .where(eq(transactions.categoryId, id))
        .run();

      db.delete(categories).where(eq(categories.id, id)).run();
    });

    return c.json({ ok: true });
  });
