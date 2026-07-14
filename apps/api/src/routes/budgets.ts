import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { budgetUpsertSchema, yearMonthSchema } from "@liushui/shared";
import { yuanToCents } from "@liushui/shared";
import { db } from "../db/client.js";
import { budgets } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const budgetsRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/budgets/:yearMonth", (c) => {
    const ym = c.req.param("yearMonth");
    const parsed = yearMonthSchema.safeParse(ym);
    if (!parsed.success) {
      return c.json({ error: "月份格式应为 YYYY-MM" }, 400);
    }

    const row = db
      .select()
      .from(budgets)
      .where(eq(budgets.yearMonth, parsed.data))
      .get();

    if (!row) {
      return c.json(null, 200);
    }

    return c.json({
      ...row,
      byCategory: row.byCategory ? JSON.parse(row.byCategory) : {},
    });
  })
  .put("/budgets/:yearMonth", async (c) => {
    const ym = c.req.param("yearMonth");
    const parsed = yearMonthSchema.safeParse(ym);
    if (!parsed.success) {
      return c.json({ error: "月份格式应为 YYYY-MM" }, 400);
    }

    const body = await c.req.json();
    const p = budgetUpsertSchema.safeParse(body);
    if (!p.success) {
      return c.json({ error: p.error.issues[0].message }, 400);
    }

    const existing = db
      .select()
      .from(budgets)
      .where(eq(budgets.yearMonth, parsed.data))
      .get();

    const totalCents =
      p.data.totalYuan != null && p.data.totalYuan !== ""
        ? yuanToCents(p.data.totalYuan)
        : null;

    const byCategory: Record<string, number> = {};
    if (p.data.byCategoryYuan) {
      for (const [catId, val] of Object.entries(p.data.byCategoryYuan)) {
        if (val !== "" && val != null) {
          byCategory[catId] = yuanToCents(val);
        }
      }
    }

    if (existing) {
      db.update(budgets)
        .set({
          totalCents,
          byCategory: JSON.stringify(byCategory),
          updatedAt: nowIso(),
        })
        .where(eq(budgets.id, existing.id))
        .run();

      return c.json({ ...existing, totalCents, byCategory });
    }

    const row = {
      id: newId("bud"),
      yearMonth: parsed.data,
      totalCents,
      byCategory: JSON.stringify(byCategory),
      updatedAt: nowIso(),
    };

    db.insert(budgets).values(row).run();
    return c.json({ ...row, totalCents, byCategory }, 201);
  });
