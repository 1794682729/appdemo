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

  // iOS 18 shortcut install guide — manual creation in Shortcuts app
  // (iOS 18 blocks all unsigned .shortcut file imports)
  .get("/webhook/shortcut", requireAuth, async (c) => {
    const userId = c.var.userId;

    // Get or create a token
    const rows = await db.select({ token: apiTokens.token }).from(apiTokens)
      .where(eq(apiTokens.userId, userId)).limit(1);

    let token: string;
    if (rows[0]) {
      token = rows[0].token;
    } else {
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

    const proto = c.req.header("X-Forwarded-Proto") ?? "https";
    const host = c.req.header("Host") ?? "localhost:3001";
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    const serverUrl = allowedOrigin ?? `${proto}://${host}`;
    const apiUrl = `${serverUrl}/api/webhook/quick`;

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>创建快捷指令</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; background: #f2f2f7; color: #1c1c1e; padding: 24px 16px 40px; }
  .card { background: #fff; border-radius: 16px; padding: 24px 20px; max-width: 400px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  h2 { font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 4px; }
  .sub { font-size: 14px; color: #8e8e93; text-align: center; margin-bottom: 20px; }
  .copy-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
  .copy-row label { font-size: 12px; color: #8e8e93; width: 36px; flex-shrink: 0; }
  .copy-row code { flex:1; font-size: 12px; background: #f2f2f7; padding: 8px 10px; border-radius: 8px; word-break: break-all; }
  .copy-row button { flex-shrink:0; font-size:12px; padding:6px 12px; border:none; background:#0f766e; color:#fff; border-radius:8px; }
  .copy-row button:active { opacity:0.8; }
  .divider { border-top:1px solid #e5e5ea; margin:20px 0; }
  h4 { font-size:13px; color:#8e8e93; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; }
  .step { display:flex; gap:10px; align-items:flex-start; margin-bottom:12px; }
  .step-num { width:20px;height:20px;border-radius:50%;background:#0f766e;color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px; }
  .step-text { font-size:14px;line-height:1.5;color:#3a3a3c; }
  .step-text b { color:#1c1c1e; }
  .step-text .val { display:inline-block;background:#f2f2f7;padding:1px 6px;border-radius:4px;font-size:12px;word-break:break-all; }
  .note { font-size:12px;color:#8e8e93;text-align:center;margin-top:16px;line-height:1.5; }
</style>
</head>
<body>
  <div class="card">
    <h2>&#x1F4F2; 创建快捷指令</h2>
    <p class="sub">iOS 18 需在快捷指令 App 中手动创建（约 2 分钟）</p>

    <h4>准备工作：复制以下信息</h4>
    <div class="copy-row">
      <label>地址</label>
      <code id="url">${apiUrl}</code>
      <button onclick="copyText('url')">复制</button>
    </div>
    <div class="copy-row">
      <label>Token</label>
      <code id="token">${token}</code>
      <button onclick="copyText('token')">复制</button>
    </div>

    <div class="divider"></div>

    <h4>创建步骤</h4>
    <div class="step"><span class="step-num">1</span><div class="step-text">打开 <b>快捷指令 App</b>，点右上角 <b>+</b> 新建</div></div>
    <div class="step"><span class="step-num">2</span><div class="step-text">搜索添加 <b>"获取剪贴板"</b></div></div>
    <div class="step"><span class="step-num">3</span><div class="step-text">搜索添加 <b>"URL"</b>，填入：<br><span class="val">${apiUrl}</span></div></div>
    <div class="step"><span class="step-num">4</span><div class="step-text">搜索添加 <b>"获取 URL 内容"</b>，点展开修改：<br>· 方法 → <b>POST</b><br>· 请求头 → 添加两行：<br>&nbsp;&nbsp;<span class="val">Authorization</span> : <span class="val">Bearer ${token}</span><br>&nbsp;&nbsp;<span class="val">Content-Type</span> : <span class="val">application/json</span><br>· 请求体 → <b>JSON</b>，添加字段：<br>&nbsp;&nbsp;<span class="val">text</span> → 选「剪贴板」变量</div></div>
    <div class="step"><span class="step-num">5</span><div class="step-text">搜索添加 <b>"获取词典值"</b>，键填 <span class="val">message</span><br>（从上一步 URL 内容获取）</div></div>
    <div class="step"><span class="step-num">6</span><div class="step-text">再添加一个 <b>"获取词典值"</b>，键填 <span class="val">error</span></div></div>
    <div class="step"><span class="step-num">7</span><div class="step-text">搜索添加 <b>"如果"</b>，条件选 <b>"有任何值"</b><br>输入选上一步的「词典值(error)」</div></div>
    <div class="step"><span class="step-num">8</span><div class="step-text">在「如果」下方添加 <b>"显示通知"</b>：<br>标题 <span class="val">记账失败</span>，正文选「词典值(error)」</div></div>
    <div class="step"><span class="step-num">9</span><div class="step-text">在「否则」下方添加 <b>"显示通知"</b>：<br>标题 <span class="val">流水记账</span>，正文选「词典值(message)」</div></div>
    <div class="step"><span class="step-num">10</span><div class="step-text">点右上角 <b>完成</b>，命名为 <b>流水记账</b></div></div>
    <div class="step"><span class="step-num">11</span><div class="step-text">设置 → 辅助功能 → 触控 → 轻点背面 → 选「流水记账」</div></div>
  </div>
  <p class="note">复制支付文字后，双击手机背面即可自动记账</p>
<script>
function copyText(id) {
  var el = document.getElementById(id);
  var text = el.textContent;
  navigator.clipboard.writeText(text).then(function() {
    var btn = event.target;
    btn.textContent = '已复制';
    setTimeout(function(){ btn.textContent = '复制'; }, 1500);
  });
}
</script>
</body>
</html>`;

    return c.html(html);
  });
