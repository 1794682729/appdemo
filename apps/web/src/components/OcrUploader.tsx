import { useState, useRef } from "react";
import { ocrApi, aiApi, type AiParseResult, ApiError } from "../lib/api";

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

  const handleFile = async (file: File) => {
    // Show preview
    setStep("uploading");
    setError("");

    try {
      // Step 1: OCR
      setStep("ocr");
      const ocrResult = await ocrApi.parse(file);
      setRawText(ocrResult.rawText);

      if (!ocrResult.rawText) {
        setError("未能识别图片中的文字，请确认图片清晰度");
        setStep("error");
        return;
      }

      // Step 2: AI Parse
      setStep("parsing");
      const aiResult = await aiApi.parse(ocrResult.rawText);
      setPreview(aiResult);
      setStep("done");
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
    }
  };

  const handleReset = () => {
    setStep("idle");
    setPreview(null);
    setRawText("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
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
            <span className="text-[18px] font-bold text-ios-text">
              ¥{preview.amountYuan.toFixed(2)}
            </span>
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
          <p className="text-[12px] text-ios-tertiary truncate">原文: {rawText}</p>
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
