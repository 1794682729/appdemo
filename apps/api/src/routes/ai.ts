import { Hono } from "hono";
import { and, eq, or, like } from "drizzle-orm";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";
import { parseWithAI } from "../lib/aiParse.js";
import { findMerchantRuleCategory } from "../lib/merchantRule.js";

export const aiRoute = new Hono<{ Variables: AuthVariables }>()
  .post("/ai/parse", requireAuth, async (c) => {
    const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
    if (!apiKey) {
      return c.json({ error: "AI 服务未配置，请设置 DEEPSEEK_API_KEY 环境变量" }, 503);
    }

    const body = await c.req.json();
    const text = body.text as string | undefined;
    if (!text || text.trim().length === 0) {
      return c.json({ error: "请输入要识别的文字" }, 400);
    }

    try {
      const parsed = await parseWithAI(text.trim(), apiKey);
      const userId = c.var.userId;

      // Look up merchant rule for suggested category
      const suggestedCategoryId = await findMerchantRuleCategory(userId, parsed.note);

      // Look up categoryId — fuzzy match to handle renamed categories
      let categoryId: string | null = null;
      const catRows = await db.select().from(categories)
        .where(and(
          eq(categories.userId, userId),
          or(eq(categories.name, parsed.categoryName), like(categories.name, `%${parsed.categoryName}%`)),
        ))
        .limit(1);
      if (catRows[0]) categoryId = catRows[0].id;

      return c.json({
        type: parsed.type,
        amountYuan: parsed.amountYuan,
        categoryName: parsed.categoryName,
        categoryId,
        suggestedCategoryId,
        date: parsed.date,
        note: parsed.note,
      });
    } catch (err) {
      console.error("[ai parse] error:", err);
      return c.json({ error: "AI 解析失败，请检查输入文字" }, 500);
    }
  });
