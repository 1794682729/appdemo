import { Hono } from "hono";
import { and, eq, count } from "drizzle-orm";
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

async function seedIfEmpty(userId: string) {
  const rows = await db.select({ count: count() }).from(categories).where(eq(categories.userId, userId));
  if ((rows[0].count as number) > 0) return;
  const now = nowIso();
  for (const c of SEED_CATEGORIES) {
    await db.insert(categories).values({ id: newId("cat"), userId, name: c.name, type: c.type, icon: c.icon, sort: c.sort, createdAt: now });
  }
}

export const categoriesRoute = new Hono<{ Variables: AuthVariables }>()
  .get("/categories", requireAuth, async (c) => {
    const userId = c.var.userId;
    await seedIfEmpty(userId);
    const rows = await db.select().from(categories).where(eq(categories.userId, userId));
    return c.json(rows);
  })
  .post("/categories", requireAuth, async (c) => {
    const userId = c.var.userId;
    const body = await c.req.json();
    const parsed = categoryCreateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);
    const row = { id: newId("cat"), userId, name: parsed.data.name, type: parsed.data.type, icon: parsed.data.icon, sort: parsed.data.sort ?? 0, createdAt: nowIso() };
    await db.insert(categories).values(row);
    return c.json(row, 201);
  })
  .patch("/categories/:id", requireAuth, async (c) => {
    const userId = c.var.userId;
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);
    const rows = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).limit(1);
    const existing = rows[0];
    if (!existing) return c.json({ error: "分类不存在" }, 404);
    const updates = { ...parsed.data };
    await db.update(categories).set(updates).where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return c.json({ ...existing, ...updates });
  })
  .delete("/categories/:id", requireAuth, async (c) => {
    const userId = c.var.userId;
    const id = c.req.param("id");
    const rows = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).limit(1);
    const existing = rows[0];
    if (!existing) return c.json({ error: "分类不存在" }, 404);
    await tx(async () => {
      await db.update(transactions).set({ categoryId: "" }).where(eq(transactions.categoryId, id));
      await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
    });
    return c.json({ ok: true });
  });
