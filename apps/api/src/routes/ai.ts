import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
// Read at request time so .env hot-reload works without restart

const PARSE_PROMPT = `你是记账助手。从 OCR 识别的支付截图文字中提取信息，返回纯 JSON（禁止 markdown 代码块）：

{"type":"expense","amountYuan":45.50,"categoryName":"餐饮","date":"2026-07-15","note":"麦当劳"}

规则（务必严格遵守）：
1. type: 判断支付/消费/扣款/支出→"expense"；入账/工资/退款/收入→"income"
2. amountYuan: 必须从 OCR 文字中找到金额！常见格式：¥45.50、￥45.50、45.50元、45.50 元、Y45.50（OCR 可能把¥识别为Y）、消费45.50、付款45.50、金额45.50。提取纯数字，例 45.50→45.50。如果实在找不到任何金额，填 0
3. categoryName: 从商户名/商品名推断：麦当劳/肯德基/饭店/外卖→餐饮；滴滴/地铁/公交/加油→交通；淘宝/京东/拼多多/超市→购物；房租/物业/水电→住房；电影/游戏/旅游→娱乐；医院/药店→医疗；工资/奖金/转账收入→工资。不确定就填"其他支出"
4. date: 提取 OCR 中日期，格式 YYYY-MM-DD。如果没有，填空字符串
5. note: 直接从 OCR 文字中提取商户名，不要编造。例如 OCR 有"胖子口味菜(天马店)"就如实写"胖子口味菜"，不要改成别的名字

OCR 识别文字：`;

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
      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a helpful assistant. Always respond with valid JSON only, no markdown formatting." },
            { role: "user", content: PARSE_PROMPT + text },
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[ai parse] DeepSeek API error:", res.status, errText);
        return c.json({ error: "AI 服务调用失败" }, 502);
      }

      const data = await res.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices?.[0]?.message?.content?.trim() ?? "";

      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr) as {
        type?: string;
        amountYuan?: number;
        categoryName?: string;
        date?: string;
        note?: string;
      };

      return c.json({
        type: parsed.type === "income" ? "income" : "expense",
        amountYuan: parsed.amountYuan ?? 0,
        categoryName: parsed.categoryName ?? "其他支出",
        date: parsed.date ?? "",
        note: parsed.note ?? "",
      });
    } catch (err) {
      console.error("[ai parse] error:", err);
      return c.json({ error: "AI 解析失败，请检查输入文字" }, 500);
    }
  });
