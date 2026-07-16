import { Hono } from "hono";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { parseImageWithVision } from "../lib/aiParse.js";

// Resolve local traineddata path from npm-installed package, avoiding blocked CDN
const require = createRequire(import.meta.url);
const dataPkgDir = path.dirname(require.resolve("@tesseract.js-data/chi_sim/package.json"));
const langPath = path.join(dataPkgDir, "4.0.0_best_int");

let workerPromise: ReturnType<typeof createWorker> | null = null;

function createChiSimWorker() {
  return createWorker("chi_sim", 1, { langPath });
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createChiSimWorker();
  }
  try {
    return await workerPromise;
  } catch {
    // Worker crashed — recreate
    workerPromise = createChiSimWorker();
    return await workerPromise;
  }
}

/** Preprocess image for better OCR: grayscale → contrast → sharpen */
async function preprocessImage(buffer: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(buffer))
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.5 })
    .toBuffer();
}

export const ocrRoute = new Hono<{ Variables: AuthVariables }>()
  .post("/ocr/parse", requireAuth, async (c) => {
    const body = await c.req.parseBody();
    const file = body.image as File | undefined;
    if (!file) return c.json({ error: "请上传图片" }, 400);

    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.includes(file.type)) {
      return c.json({ error: "不支持的图片格式，请上传 PNG/JPG/WebP" }, 400);
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({ error: "图片过大，请上传 10MB 以内的图片" }, 400);
    }

    try {
      const buffer = await file.arrayBuffer();
      const processed = await preprocessImage(buffer);
      const worker = await getWorker();
      // PSM 11 = sparse text — captures both large bold amounts and small details in payment screenshots.
      // NOTE: setParameters mutates the shared singleton worker. Fine as long as all OCR requests
      // are Chinese payment screenshots. If you add other OCR use cases, set PSM per-call instead.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      // Pass 1: full text recognition
      const { data: fullData } = await worker.recognize(processed);
      const fullText = fullData.text.trim();

      // Pass 2: digit-only recognition (whitelist) — much more accurate for amounts
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: "0123456789.¥￥, ",
      });
      const { data: numData } = await worker.recognize(processed);
      const numText = numData.text.trim();

      // Restore full charset so subsequent requests aren't affected
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: "",
      });

      // Combine: full text first, then digit-only excerpt for AI to cross-reference
      const rawText = numText
        ? `${fullText}\n[金额数字] ${numText}`
        : fullText;

      if (!fullText && !numText) {
        return c.json({ error: "未能识别图片中的文字，请确认图片清晰度", rawText: "" }, 422);
      }
      return c.json({ rawText });
    } catch (err) {
      console.error("[ocr error]", err);
      return c.json({ error: "图片识别失败，请稍后重试", rawText: "" }, 500);
    }
  })
  .post("/ocr/vision", requireAuth, async (c) => {
    const apiKey = process.env.DASHSCOPE_API_KEY ?? "";
    if (!apiKey) {
      return c.json({ error: "千问视觉服务未配置，请设置 DASHSCOPE_API_KEY" }, 503);
    }

    const body = await c.req.parseBody();
    const file = body.image as File | undefined;
    if (!file) return c.json({ error: "请上传图片" }, 400);

    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.includes(file.type)) {
      return c.json({ error: "不支持的图片格式，请上传 PNG/JPG/WebP" }, 400);
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({ error: "图片过大，请上传 10MB 以内的图片" }, 400);
    }

    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const result = await parseImageWithVision(base64, file.type, apiKey);
      return c.json(result);
    } catch (err) {
      console.error("[ocr vision error]", err);
      return c.json({ error: "AI 识图失败，请稍后重试" }, 500);
    }
  });
