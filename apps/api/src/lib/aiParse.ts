const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const PARSE_PROMPT = `你是记账助手。从支付文字中提取信息，返回纯 JSON（禁止 markdown 代码块）：

{"type":"expense","amountYuan":45.50,"categoryName":"餐饮","date":"2026-07-15","note":"麦当劳"}

规则（务必严格遵守）：
1. type: 支付/消费/扣款/支出→"expense"；入账/工资/退款/收入→"income"
2. amountYuan: 从文字中找金额！常见格式：¥45.50、￥45.50、45.50元、45.50 元、Y45.50、消费45.50、付款45.50。提取纯数字，例 45.50→45.50。找不到填 0
3. categoryName: 从商户名推断：麦当劳/肯德基/饭店/外卖→餐饮；滴滴/地铁/公交/加油→交通；淘宝/京东/拼多多/超市→购物；房租/物业/水电→住房；电影/游戏/旅游→娱乐；医院/药店→医疗；工资/奖金→工资。不确定填"其他支出"
4. date: YYYY-MM-DD 格式，没有填空字符串
5. note: 从原文提取商户名，如实摘录，不要编造

文字：`;

export type AiParsed = {
  type: "expense" | "income";
  amountYuan: number;
  categoryName: string;
  date: string;
  note: string;
};

export async function parseWithAI(text: string, apiKey: string): Promise<AiParsed> {
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
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";

  let jsonStr = content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  const parsed = JSON.parse(jsonStr) as {
    type?: string; amountYuan?: number; categoryName?: string; date?: string; note?: string;
  };

  return {
    type: parsed.type === "income" ? "income" : "expense",
    amountYuan: parsed.amountYuan ?? 0,
    categoryName: parsed.categoryName ?? "其他支出",
    date: (parsed.date && parsed.date.length === 10) ? parsed.date : "",
    note: parsed.note ?? "",
  };
}
