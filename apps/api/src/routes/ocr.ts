import { Hono } from "hono";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { createRequire } from "node:module";
import path from "node:path";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

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
      const worker = await getWorker();
      // PSM 11 = sparse text — captures both large bold amounts and small details in payment screenshots.
      // NOTE: setParameters mutates the shared singleton worker. Fine as long as all OCR requests
      // are Chinese payment screenshots. If you add other OCR use cases, set PSM per-call instead.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const { data } = await worker.recognize(Buffer.from(buffer));
      const rawText = data.text.trim();
      if (!rawText) {
        return c.json({ error: "未能识别图片中的文字，请确认图片清晰度", rawText: "" }, 422);
      }
      return c.json({ rawText });
    } catch (err) {
      console.error("[ocr error]", err);
      return c.json({ error: "图片识别失败，请稍后重试", rawText: "" }, 500);
    }
  });
