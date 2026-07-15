import { Hono } from "hono";
import { and, eq, like } from "drizzle-orm";
import { yearMonthSchema, currentYearMonth, listRecentYearMonths } from "@liushui/shared";
import { db } from "../db/client.js";
import { transactions, categories } from "../db/schema.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const statsRoute = new Hono<{ Variables: AuthVariables }>()
  .get("/stats/summary", requireAuth, async (c) => {
    const userId = c.var.userId;
    const yearMonth = c.req.query("yearMonth") ?? currentYearMonth();
    const parsed = yearMonthSchema.safeParse(yearMonth);
    if (!parsed.success) return c.json({ error: "月份格式应为 YYYY-MM" }, 400);
    const rows = await db.select({ type: transactions.type, amountCents: transactions.amountCents })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${parsed.data}-%`)));
    let totalExpense = 0, totalIncome = 0;
    for (const r of rows) { if (r.type === "expense") totalExpense += r.amountCents; else totalIncome += r.amountCents; }
    return c.json({ totalExpense, totalIncome, balance: totalIncome - totalExpense });
  })
  .get("/stats/by-category", requireAuth, async (c) => {
    const userId = c.var.userId;
    const yearMonth = c.req.query("yearMonth") ?? currentYearMonth();
    const parsed = yearMonthSchema.safeParse(yearMonth);
    if (!parsed.success) return c.json({ error: "月份格式应为 YYYY-MM" }, 400);
    const catMap = new Map<string, { name: string; icon: string; total: number }>();
    const cats = await db.select().from(categories).where(eq(categories.userId, userId));
    for (const cat of cats) catMap.set(cat.id, { name: cat.name, icon: cat.icon, total: 0 });
    const rows = await db.select({ categoryId: transactions.categoryId, amountCents: transactions.amountCents })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${parsed.data}-%`), eq(transactions.type, "expense")));
    for (const r of rows) { const entry = catMap.get(r.categoryId); if (entry) entry.total += r.amountCents; }
    const result = Array.from(catMap.entries()).filter(([, v]) => v.total > 0).map(([categoryId, v]) => ({ categoryId, categoryName: v.name, categoryIcon: v.icon, totalCents: v.total })).sort((a, b) => b.totalCents - a.totalCents);
    return c.json(result);
  })
  .get("/stats/trend", requireAuth, async (c) => {
    const userId = c.var.userId;
    const months = Number(c.req.query("months") ?? "6");
    const list = listRecentYearMonths(months);
    const result = [];
    for (const ym of list) {
      let expense = 0, income = 0;
      const rows = await db.select({ type: transactions.type, amountCents: transactions.amountCents })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), like(transactions.date, `${ym}-%`)));
      for (const r of rows) { if (r.type === "expense") expense += r.amountCents; else income += r.amountCents; }
      result.push({ yearMonth: ym, expense, income });
    }
    return c.json(result);
  });
