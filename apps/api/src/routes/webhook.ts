import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { transactionCreateSchema, yuanToCents } from "@liushui/shared";
import { db } from "../db/client.js";
import { apiTokens, transactions } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

// Bearer token auth: validate against api_tokens table
async function bearerAuth(c: any) {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const rows = await db.select({
    userId: apiTokens.userId,
    tokenId: apiTokens.id,
  }).from(apiTokens).where(eq(apiTokens.token, token)).limit(1);

  const row = rows[0];
  if (!row) return null;

  // Update last_used_at
  await db.update(apiTokens).set({ lastUsedAt: nowIso() }).where(eq(apiTokens.id, row.tokenId));

  return row.userId;
}

export const webhookRoute = new Hono<{ Variables: AuthVariables }>()
  // Token management (cookie auth)
  .get("/webhook/tokens", requireAuth, async (c) => {
    const userId = c.var.userId;
    const rows = await db.select({
      id: apiTokens.id,
      token: apiTokens.token,
      label: apiTokens.label,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    }).from(apiTokens).where(eq(apiTokens.userId, userId));
    return c.json(rows.map((r) => ({
      ...r,
      tokenPreview: r.token.slice(-8),
    })));
  })
  .post("/webhook/tokens", requireAuth, async (c) => {
    const userId = c.var.userId;
    const body = await c.req.json();
    const label = (body.label as string) ?? "快捷指令";

    const tokenStr = newId("sk");
    await db.insert(apiTokens).values({
      id: newId("tok"),
      userId,
      token: tokenStr,
      label,
      createdAt: nowIso(),
    });

    return c.json({ token: tokenStr, label, createdAt: nowIso() }, 201);
  })
  .delete("/webhook/tokens/:id", requireAuth, async (c) => {
    const userId = c.var.userId;
    const id = c.req.param("id");
    const rows = await db.select({ id: apiTokens.id }).from(apiTokens)
      .where(eq(apiTokens.id, id)).limit(1);
    if (!rows[0]) return c.json({ error: "Token 不存在" }, 404);
    await db.delete(apiTokens).where(eq(apiTokens.id, id));
    return c.json({ ok: true });
  })

  // Webhook transaction creation (Bearer token auth, no cookie)
  .post("/webhook/transaction", async (c) => {
    const userId = await bearerAuth(c);
    if (!userId) {
      return c.json({ error: "未授权，请在设置页生成 API Token" }, 401);
    }

    const body = await c.req.json();
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

    const { type, amountYuan, categoryId, date, note } = parsed.data;
    const amountCents = yuanToCents(amountYuan);
    const now = nowIso();
    const row = { id: newId("tx"), userId, type, amountCents, categoryId, date, note: note ?? "", createdAt: now, updatedAt: now };
    await db.insert(transactions).values(row);
    return c.json(row, 201);
  });
