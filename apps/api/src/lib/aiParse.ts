const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const PARSE_PROMPT = `你是记账助手。从OCR识别的支付截图文字中提取信息。

先分析思考，再输出结果。思考过程放在 <thinking></thinking> 标签中，最终JSON结果放在 <result></result> 标签中。

=== 示例 1：多金额+优惠 ===
文字：麦当劳 巨无霸套餐 36.00 薯条 12.00 小计 48.00 优惠 -8.00 实付 ¥40.00
<thinking>识别到多个金额：36.00、12.00、48.00、-8.00、40.00。其中36.00和12.00是商品单价，48.00是小计，-8.00是优惠，"实付"后面的40.00是实际支付金额。</thinking>
<result>{"type":"expense","amountYuan":40.00,"categoryName":"餐饮","date":"","note":"麦当劳"}</result>

=== 示例 2：OCR缺失小数点 ===
文字：微信支付 收款方 瑞幸咖啡 消费金额 1850 元 支付时间 2026-07-15
[金额数字] 18.50 2026 07 15
<thinking>OCR识别出"1850"，但[金额数字]中显示18.50。数字白名单OCR对金额更准确，"1850"是OCR漏了小数点，正确金额为18.50。</thinking>
<result>{"type":"expense","amountYuan":18.50,"categoryName":"餐饮","date":"2026-07-15","note":"瑞幸咖啡"}</result>

=== 示例 3：简单单金额 ===
文字：付款成功 ￥23.80 收款方 美团外卖
<thinking>唯一金额23.80，收款方美团外卖。</thinking>
<result>{"type":"expense","amountYuan":23.80,"categoryName":"餐饮","date":"","note":"美团外卖"}</result>

=== 示例 4：收入入账 ===
文字：招商银行 工资入账 +15,000.00 交易时间 2026-07-10
<thinking>金额15000.00，关键词"工资入账"表明这是收入。</thinking>
<result>{"type":"income","amountYuan":15000.00,"categoryName":"工资","date":"2026-07-10","note":"招商银行"}</result>

规则（务必严格遵守）：
1. type: 支付/消费/扣款/支出/付款/扫码→"expense"；入账/工资/退款/收入/转入/到账→"income"
2. amountYuan: **这是最关键的一项，必须仔细识别！**
   - **[金额数字]是数字白名单OCR结果，对数字识别更准确，优先信任其中的金额！**
   - 金额优先级：实付 > 应付 > 合计/总计/支付金额 > ¥/￥后最大的数字 > 文本中最后一个金额
   - 绝对不要取：优惠/折扣/立减/退款/小计/商品单价 后面的数字
   - 常见格式：¥45.50、￥45.50、45.50元、Y45.50、消费45.50、付款45.50、金额45.50、+45.50
   - OCR纠错：如果正文中的数字与[金额数字]不一致，以[金额数字]为准
   - "45,50"→45.50；"45.5"→45.50；消费类场景中4位整数大概率是漏了小数点
   - 移除千分位逗号：1,234.56→1234.56
   - 找不到任何金额时填0
3. categoryName: 麦当劳/肯德基/饭店/外卖/咖啡/奶茶/小吃/餐厅/烘焙/食堂→餐饮；滴滴/地铁/公交/加油/停车/高铁/飞机/打车→交通；淘宝/京东/拼多多/超市/便利店/商场/网购→购物；房租/物业/水电/燃气/宽带→住房；电影/游戏/旅游/景区/KTV→娱乐；医院/药店/诊所/体检→医疗；工资/奖金/报销/兼职/理财→工资。不确定填"其他支出"
4. date: YYYY-MM-DD格式，没有填空字符串""
5. note: 从原文摘录商户名/收款方，如实摘录，不要编造

OCR 识别文字：`;

const VISION_PROMPT = `你是记账助手。这是一张支付截图，直接从中提取信息。

先分析思考，再输出结果。思考过程放在 <thinking></thinking> 标签中，最终JSON结果放在 <result></result> 标签中。

规则：
1. type: 支付/消费/扣款/支出/付款/扫码→"expense"；入账/工资/退款/收入/转入/到账→"income"
2. amountYuan: 从截图中找到**实际支付金额**（实付金额），提取纯数字。
   - 优先取"实付/实际支付/应付/合计/支付金额"对应的数字
   - 不要取优惠/折扣/立减/小计/商品单价
   - 找不到填0
3. categoryName: 根据商户名推断。麦当劳/肯德基/饭店/外卖/咖啡/奶茶/小吃/餐厅→餐饮；滴滴/地铁/公交/加油/停车/高铁/打车→交通；淘宝/京东/拼多多/超市/便利店→购物；房租/物业/水电→住房；电影/游戏/旅游→娱乐；医院/药店→医疗；工资/奖金→工资。不确定填"其他支出"
4. date: YYYY-MM-DD格式，没有填空字符串""
5. note: 商户名或收款方，如实摘录`;

export type AiParsed = {
  type: "expense" | "income";
  amountYuan: number;
  categoryName: string;
  date: string;
  note: string;
};

function extractJsonFromResponse(content: string): string {
  // Priority 1: Extract from <result> tag
  const resultMatch = content.match(/<result>\s*(\{[\s\S]*?\})\s*<\/result>/);
  if (resultMatch) return resultMatch[1];

  // Priority 2: Extract bare JSON object
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return content;
}

function normalizeParsed(parsed: { type?: string; amountYuan?: number; categoryName?: string; date?: string; note?: string }): AiParsed {
  return {
    type: parsed.type === "income" ? "income" : "expense",
    amountYuan: parsed.amountYuan ?? 0,
    categoryName: parsed.categoryName ?? "其他支出",
    date: (parsed.date && parsed.date.length === 10) ? parsed.date : "",
    note: parsed.note ?? "",
  };
}

const QWEN_VL_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function parseImageWithVision(imageBase64: string, mimeType: string, apiKey: string): Promise<AiParsed> {
  const res = await fetch(QWEN_VL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen-vl-plus",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
      stop: ["</result>"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[vision api] status:", res.status, "body:", errText.slice(0, 500));
    throw new Error(`DeepSeek Vision API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  console.log("[vision api] response:", content.slice(0, 300));

  const jsonStr = extractJsonFromResponse(content);
  const parsed = JSON.parse(jsonStr) as {
    type?: string; amountYuan?: number; categoryName?: string; date?: string; note?: string;
  };

  return normalizeParsed(parsed);
}

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
        { role: "system", content: "You are a helpful assistant. Always respond with valid JSON inside <result> tags, no extra commentary." },
        { role: "user", content: PARSE_PROMPT + text },
      ],
      temperature: 0.1,
      max_tokens: 600,
      stop: ["</result>"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";

  const jsonStr = extractJsonFromResponse(content);
  const parsed = JSON.parse(jsonStr) as {
    type?: string; amountYuan?: number; categoryName?: string; date?: string; note?: string;
  };

  return normalizeParsed(parsed);
}
