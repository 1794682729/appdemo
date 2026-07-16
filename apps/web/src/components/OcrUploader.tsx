import { useState, useRef } from "react";
import { ocrApi, aiApi, visionApi, type AiParseResult, ApiError } from "../lib/api";

type Props = {
  onParsed: (result: AiParseResult) => void;
};

type Step = "idle" | "uploading" | "ocr" | "parsing" | "done" | "error";

export function OcrUploader({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<AiParseResult | null>(null);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");
  const [manualText, setManualText] = useState("");
  const [showRawText, setShowRawText] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [usedVision, setUsedVision] = useState(false);

  const doAiParse = async (text: string) => {
    setStep("parsing");
    try {
      const aiResult = await aiApi.parse(text);
      setPreview(aiResult);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI 解析失败，请重试");
      setStep("error");
    }
  };

  const handleFile = async (file: File) => {
    setStep("uploading");
    setError("");
    setManualText("");

    // Try vision model first (direct image → AI, no OCR)
    try {
      setStep("parsing");
      const visionResult = await visionApi.parse(file);
      // visionResult lacks categoryId/suggestedCategoryId — client-side matching will handle it
      setPreview({ ...visionResult, categoryId: null, suggestedCategoryId: null });
      setRawText("");
      setUsedVision(true);
      setStep("done");
      return;
    } catch {
      // Vision failed — fall through to OCR + AI
      setUsedVision(false);
    }

    try {
      // Fallback: OCR → AI parse
      setStep("ocr");
      const ocrResult = await ocrApi.parse(file);
      setRawText(ocrResult.rawText);

      if (!ocrResult.rawText) {
        setError("未能识别图片中的文字，请确认图片清晰度，或手动输入支付文字");
        setStep("error");
        return;
      }

      // Step 2: AI Parse
      await doAiParse(ocrResult.rawText);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "识别失败，请重试");
      setStep("error");
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onParsed(preview);
      // Reset
      setStep("idle");
      setPreview(null);
      setRawText("");
      setError("");
      setManualText("");
      setShowRawText(false);
      setEditingText("");
    }
  };

  const handleReset = () => {
    setStep("idle");
    setPreview(null);
    setRawText("");
    setError("");
    setManualText("");
    setShowRawText(false);
    setEditingText("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleManualParse = () => {
    if (!manualText.trim()) return;
    setRawText(manualText.trim());
    doAiParse(manualText.trim());
  };

  const handleRetryWithEditedText = () => {
    if (!editingText.trim()) return;
    setRawText(editingText.trim());
    doAiParse(editingText.trim());
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />

      {step === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="glass-card w-full rounded-2xl py-4 text-[16px] font-medium text-ios-accent flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <span className="text-xl">📸</span>
          识别支付截图
        </button>
      )}

      {/* Processing indicator */}
      {(step === "uploading" || step === "ocr" || step === "parsing") && (
        <div className="glass-card rounded-2xl p-5 text-center space-y-3">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-ios-accent border-t-transparent" />
          <p className="text-[15px] text-ios-secondary">
            {step === "uploading" && "上传图片..."}
            {step === "ocr" && "识别文字中..."}
            {step === "parsing" && "AI 解析中..."}
          </p>
        </div>
      )}

      {/* Error */}
      {step === "error" && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-[15px] text-ios-danger text-center">{error}</p>

          {/* Manual text input fallback */}
          <div className="space-y-2">
            <p className="text-[12px] text-ios-tertiary">手动粘贴支付通知文字，直接 AI 解析：</p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="粘贴微信/支付宝的支付通知文字..."
              className="w-full glass-card rounded-xl px-4 py-3 text-[14px] outline-none min-h-[80px] resize-y"
            />
            {manualText.trim() && (
              <button
                type="button"
                onClick={handleManualParse}
                className="w-full rounded-full bg-ios-accent py-2 text-[15px] font-semibold text-white active:scale-[0.98] transition"
              >
                AI 解析这段文字
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-full border border-ios-accent py-2 text-[15px] font-medium text-ios-accent"
          >
            重试
          </button>
        </div>
      )}

      {/* Result preview */}
      {step === "done" && preview && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold text-ios-text">
                ¥{preview.amountYuan.toFixed(2)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${usedVision ? "bg-[rgba(52,199,89,0.15)] text-[#34C759]" : "bg-[rgba(142,142,147,0.15)] text-ios-tertiary"}`}>
                {usedVision ? "AI视觉" : "OCR"}
              </span>
            </div>
            <span className={`text-[15px] font-medium ${preview.type === "expense" ? "text-ios-danger" : "text-ios-income"}`}>
              {preview.type === "expense" ? "支出" : "收入"}
            </span>
          </div>
          <div className="space-y-1.5 text-[14px] text-ios-secondary">
            <div className="flex gap-2">
              <span className="w-10 text-ios-tertiary">分类</span>
              <span className="text-ios-text font-medium">{preview.categoryName}</span>
            </div>
            {preview.note && (
              <div className="flex gap-2">
                <span className="w-10 text-ios-tertiary">备注</span>
                <span className="text-ios-text">{preview.note}</span>
              </div>
            )}
            {preview.date && (
              <div className="flex gap-2">
                <span className="w-10 text-ios-tertiary">日期</span>
                <span className="text-ios-text">{preview.date}</span>
              </div>
            )}
          </div>

          {/* OCR raw text — expandable */}
          <div className="border-t border-[rgba(60,60,67,0.08)] pt-2">
            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className="flex items-center gap-1 text-[12px] text-ios-tertiary"
            >
              <span>{showRawText ? "▾" : "▸"}</span>
              OCR 识别原文
              <span className="text-ios-tertiary/60">（可能存在识别错误）</span>
            </button>
            {showRawText && (
              <div className="mt-2 space-y-2">
                {editingText ? (
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full rounded-xl bg-[rgba(118,118,128,0.08)] px-3 py-2 text-[13px] text-ios-text outline-none min-h-[60px] resize-y"
                  />
                ) : (
                  <p className="rounded-xl bg-[rgba(118,118,128,0.08)] px-3 py-2 text-[13px] text-ios-secondary leading-relaxed whitespace-pre-wrap break-all">
                    {rawText}
                  </p>
                )}
                <div className="flex gap-2">
                  {editingText ? (
                    <>
                      <button
                        type="button"
                        onClick={handleRetryWithEditedText}
                        className="flex-1 rounded-full bg-ios-accent py-1.5 text-[12px] font-medium text-white"
                      >
                        用修改后的文字重新解析
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingText("")}
                        className="rounded-full border border-[rgba(60,60,67,0.12)] px-3 py-1.5 text-[12px] text-ios-secondary"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingText(rawText)}
                      className="rounded-full border border-[rgba(60,60,67,0.12)] px-3 py-1.5 text-[12px] text-ios-secondary"
                    >
                      编辑文字
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-full bg-ios-accent py-2 text-[15px] font-semibold text-white active:scale-[0.98] transition"
            >
              确认，填入表单
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-ios-accent px-5 py-2 text-[15px] font-medium text-ios-accent"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
