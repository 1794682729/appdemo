import { Hono } from "hono";
import { and, eq, or, like } from "drizzle-orm";
import { transactionCreateSchema, yuanToCents } from "@liushui/shared";
import { db } from "../db/client.js";
import { apiTokens, transactions, categories } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { nowIso } from "../lib/time.js";
import { parseWithAI } from "../lib/aiParse.js";
import { saveMerchantRule, findMerchantRuleCategory } from "../lib/merchantRule.js";
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

// Build .shortcut plist XML — Back Tap triggered, clipboard-based
function buildShortcutPlist(serverUrl: string, token: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const clipUuid = "A1B2C3D4-0001-4000-8000-000000000001";
  const httpUuid = "A1B2C3D4-0002-4000-8000-000000000002";
  const msgUuid  = "A1B2C3D4-0003-4000-8000-000000000003";
  const errUuid  = "A1B2C3D4-0004-4000-8000-000000000004";
  const condUuid = "A1B2C3D4-0005-4000-8000-000000000005";
  const grpUuid  = "A1B2C3D4-0006-4000-8000-000000000006";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowActions</key>
  <array>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.comment</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFCommentActionText</key>
        <string>流水记账 — 复制支付文字后双击手机背面即可自动记账。
设置方法：系统设置 → 辅助功能 → 触控 → 轻点背面 → 选择此快捷指令。</string>
      </dict>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getclipboard</string>
      <key>WFWorkflowActionParameters</key>
      <dict/>
      <key>UUID</key>
      <string>${clipUuid}</string>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.url</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFURLActionURL</key>
        <string>${esc(serverUrl)}/api/webhook/quick</string>
      </dict>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getcontentsofurl</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFHTTPMethod</key>
        <string>POST</string>
        <key>WFHTTPHeaders</key>
        <dict>
          <key>Authorization</key>
          <string>Bearer ${esc(token)}</string>
          <key>Content-Type</key>
          <string>application/json</string>
        </dict>
        <key>WFHTTPBodyType</key>
        <string>JSON</string>
        <key>WFJSONValues</key>
        <dict>
          <key>text</key>
          <dict>
            <key>Value</key>
            <dict>
              <key>OutputUUID</key>
              <string>${clipUuid}</string>
              <key>Type</key>
              <string>ActionOutput</string>
            </dict>
            <key>WFSerializationType</key>
            <string>WFTextTokenAttachment</string>
          </dict>
        </dict>
      </dict>
      <key>UUID</key>
      <string>${httpUuid}</string>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getdictionaryvalue</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFGetDictionaryValueType</key>
        <string>Value</string>
        <key>WFDictionaryKey</key>
        <string>message</string>
        <key>WFDictionary</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputUUID</key>
            <string>${httpUuid}</string>
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
      </dict>
      <key>UUID</key>
      <string>${msgUuid}</string>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getdictionaryvalue</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFGetDictionaryValueType</key>
        <string>Value</string>
        <key>WFDictionaryKey</key>
        <string>error</string>
        <key>WFDictionary</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputUUID</key>
            <string>${httpUuid}</string>
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
      </dict>
      <key>UUID</key>
      <string>${errUuid}</string>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.conditional</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFCondition</key>
        <integer>100</integer>
        <key>WFInput</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputUUID</key>
            <string>${errUuid}</string>
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
      </dict>
      <key>UUID</key>
      <string>${condUuid}</string>
      <key>GroupingIdentifier</key>
      <string>${grpUuid}</string>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.notification</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFNotificationActionTitle</key>
        <string>记账失败</string>
        <key>WFNotificationActionBody</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputUUID</key>
            <string>${errUuid}</string>
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
      </dict>
      <key>GroupingIdentifier</key>
      <string>${grpUuid}</string>
      <key>WFControlFlowMode</key>
      <integer>1</integer>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.notification</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFNotificationActionTitle</key>
        <string>流水记账</string>
        <key>WFNotificationActionBody</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputUUID</key>
            <string>${msgUuid}</string>
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
      </dict>
      <key>GroupingIdentifier</key>
      <string>${grpUuid}</string>
      <key>WFControlFlowMode</key>
      <integer>2</integer>
    </dict>
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.conditional</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFCondition</key>
        <integer>2</integer>
        <key>WFInput</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputUUID</key>
            <string>${errUuid}</string>
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
      </dict>
      <key>GroupingIdentifier</key>
      <string>${grpUuid}</string>
    </dict>
  </array>
  <key>WFWorkflowClientVersion</key>
  <string>900</string>
  <key>WFWorkflowIcon</key>
  <dict>
    <key>WFWorkflowIconStartColor</key>
    <integer>4282601983</integer>
    <key>WFWorkflowIconGlyphNumber</key>
    <integer>59440</integer>
  </dict>
  <key>WFWorkflowImportQuestions</key>
  <array/>
  <key>WFWorkflowMinimumClientVersion</key>
  <integer>900</integer>
</dict>
</plist>`;
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

    // Limit: max 5 tokens per user
    const rows = await db.select({ id: apiTokens.id }).from(apiTokens)
      .where(eq(apiTokens.userId, userId));
    if (rows.length >= 5) {
      return c.json({ error: "最多 5 个 Token，请删除旧 Token 后再创建" }, 400);
    }

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

    // Fire-and-forget: save merchant rule
    const finalNote = note ?? "";
    if (finalNote.length > 0) {
      saveMerchantRule(userId, finalNote, categoryId).catch((e) => console.error("[merchant rule save]", e));
    }

    return c.json(row, 201);
  })

  // Quick add: accepts plain text, parses with AI, auto-creates transaction
  // Designed for Back Tap / Siri / widget — reads clipboard, returns notification-friendly message
  .post("/webhook/quick", async (c) => {
    const userId = await bearerAuth(c);
    if (!userId) {
      return c.json({ error: "未授权，请先生成 API Token" }, 401);
    }

    const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
    if (!apiKey) {
      return c.json({ error: "AI 服务未配置" }, 503);
    }

    const body = await c.req.json();
    const text = body.text as string | undefined;
    if (!text || text.trim().length === 0) {
      return c.json({ error: "请输入支付文字" }, 400);
    }

    try {
      // 1. AI parse
      const parsed = await parseWithAI(text.trim(), apiKey);

      if (parsed.amountYuan <= 0) {
        return c.json({ error: "未能识别金额，请检查文字内容" }, 422);
      }

      const date = parsed.date || new Date().toISOString().slice(0, 10);

      // 2. Match category — merchant rules first, then AI categoryName (fuzzy), then fallback
      let categoryId: string | null = await findMerchantRuleCategory(userId, parsed.note);

      if (!categoryId) {
        // Fuzzy match category name (handles renamed categories)
        const catRows = await db.select().from(categories)
          .where(and(
            eq(categories.userId, userId),
            or(eq(categories.name, parsed.categoryName), like(categories.name, `%${parsed.categoryName}%`)),
          ))
          .limit(1);
        if (catRows[0]) categoryId = catRows[0].id;
      }
      if (!categoryId) {
        // Fallback: first matching type category
        const catRows = await db.select().from(categories)
          .where(and(eq(categories.userId, userId), eq(categories.type, parsed.type === "income" ? "income" : "expense")))
          .limit(1);
        if (catRows[0]) categoryId = catRows[0].id;
      }
      if (!categoryId) {
        return c.json({ error: "没有可用分类，请先在 App 中创建分类" }, 400);
      }

      // 3. Create transaction
      const amountCents = yuanToCents(parsed.amountYuan);
      const now = nowIso();
      const row = { id: newId("tx"), userId, type: parsed.type, amountCents, categoryId, date, note: parsed.note, createdAt: now, updatedAt: now };
      await db.insert(transactions).values(row);

      // 4. Fire-and-forget: save merchant rule
      if (parsed.note.length > 0) {
        saveMerchantRule(userId, parsed.note, categoryId).catch((e) => console.error("[merchant rule save]", e));
      }

      const typeLabel = parsed.type === "income" ? "收入" : "支出";
      const amountStr = (amountCents / 100).toFixed(2);
      return c.json({
        ok: true,
        message: `已记账 ${typeLabel} ¥${amountStr} · ${parsed.categoryName}`,
        transaction: row,
      });
    } catch (err) {
      console.error("[webhook quick] error:", err);
      return c.json({ error: "解析失败，请检查输入文字或稍后重试" }, 500);
    }
  })

  // Download iOS Shortcut (.shortcut file) with embedded token
  .get("/webhook/shortcut", requireAuth, async (c) => {
    const userId = c.var.userId;

    // Get or create a token (limit 5 per user)
    const rows = await db.select({ token: apiTokens.token }).from(apiTokens)
      .where(eq(apiTokens.userId, userId)).limit(1);

    let token: string;
    if (rows[0]) {
      token = rows[0].token;
    } else {
      // Check limit before auto-creating
      const countRows = await db.select({ id: apiTokens.id }).from(apiTokens)
        .where(eq(apiTokens.userId, userId));
      if (countRows.length >= 5) {
        return c.json({ error: "Token 数量已达上限（5个），请先在设置页删除旧 Token" }, 400);
      }

      token = newId("sk");
      await db.insert(apiTokens).values({
        id: newId("tok"),
        userId,
        token,
        label: "快捷指令",
        createdAt: nowIso(),
      });
    }

    // Derive server URL from request
    const proto = c.req.header("X-Forwarded-Proto") ?? "https";
    const host = c.req.header("Host") ?? "localhost:3001";
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    const serverUrl = allowedOrigin ?? `${proto}://${host}`;

    const plist = buildShortcutPlist(serverUrl, token);
    return c.body(plist, 200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename=liushui.shortcut; filename*=UTF-8''%E6%B5%81%E6%B0%B4%E8%AE%B0%E8%B4%A6.shortcut",
    });
  });
