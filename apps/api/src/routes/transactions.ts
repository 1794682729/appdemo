import { Hono } from "hono";
import { and, eq, like } from "drizzle-orm";
import { transactionCreateSchema, transactionUpdateSchema, yearMonthSchema } from "@liushui/shared";
import { yuanToCents } from "@liushui/shared";
import { db } from "../db/client.js";
import { transactions } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const transactionsRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/transactions", async (c) => {
    const userId = c.var.userId;
    const yearMonth = c.req.query("yearMonth");
    const parsed = yearMonthSchema.safeParse(yearMonth);
    if (!parsed.success) return c.json({ error: "月份格式应为 YYYY-MM" }, 400);

    const rows = await db.select().from(transactions).where(and(eq(transactions.userId, userId), like(transactions.date, `${parsed.data}-%`)));
    rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return c.json(rows);
  })
  .post("/transactions", async (c) => {
    const userId = c.var.userId;
    const body = await c.req.json();
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);
    const { type, amountYuan, categoryId, date, note } = parsed.data;
    const amountCents = yuanToCents(amountYuan);
    const now = nowIso();
    const row = { id: newId("tx"), userId, type, amountCents, categoryId, date, note: note ?? "", createdAt: now, updatedAt: now };
    await db.insert(transactions).values(row);
    return c.json(row, 201);
  })
  .patch("/transactions/:id", async (c) => {
    const userId = c.var.userId;
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);
    const rows = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).limit(1);
    const existing = rows[0];
    if (!existing) return c.json({ error: "流水不存在" }, 404);
    const updates: Record<string, unknown> = { updatedAt: nowIso() };
    if (parsed.data.type != null) updates.type = parsed.data.type;
    if (parsed.data.amountYuan != null) updates.amountCents = yuanToCents(parsed.data.amountYuan);
    if (parsed.data.categoryId != null) updates.categoryId = parsed.data.categoryId;
    if (parsed.data.date != null) updates.date = parsed.data.date;
    if (parsed.data.note != null) updates.note = parsed.data.note;
    await db.update(transactions).set(updates).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return c.json({ ...existing, ...updates });
  })
  .delete("/transactions/:id", async (c) => {
    const userId = c.var.userId;
    const id = c.req.param("id");
    const rows = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).limit(1);
    const existing = rows[0];
    if (!existing) return c.json({ error: "流水不存在" }, 404);
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return c.json({ ok: true });
  });
