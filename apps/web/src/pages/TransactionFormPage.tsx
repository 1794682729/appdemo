import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todayDate } from "@liushui/shared";
import { categoriesApi, transactionsApi, type AiParseResult } from "../lib/api";
import { AmountInput } from "../components/AmountInput";
import { CategoryPicker } from "../components/CategoryPicker";
import { OcrUploader } from "../components/OcrUploader";

export function TransactionFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const queryClient = useQueryClient();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"], queryFn: categoriesApi.getAll,
  });
  const { data: editTx } = useQuery({
    queryKey: ["transaction", editId],
    queryFn: async () => { const txs = await transactionsApi.getAll(date.slice(0, 7)); return txs.find((t) => t.id === editId) ?? null; },
    enabled: !!editId,
  });

  useEffect(() => {
    if (editTx) { setType(editTx.type); setAmount((editTx.amountCents / 100).toString()); setCategoryId(editTx.categoryId); setDate(editTx.date); setNote(editTx.note); }
  }, [editTx]);

  // OCR auto-submit: directly creates transaction from parsed result
  const ocrSubmitMut = useMutation({
    mutationFn: (data: { type: "expense" | "income"; amountYuan: number; categoryId: string; date: string; note: string }) =>
      transactionsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); queryClient.invalidateQueries({ queryKey: ["stats"] }); navigate(-1); },
    onError: (err: Error) => setError(err.message),
  });

  const handleOcrParsed = (result: AiParseResult) => {
    // Fill form fields for visual feedback
    setType(result.type);
    setAmount(result.amountYuan ? result.amountYuan.toString() : "");
    setDate(result.date || todayDate());
    setNote(result.note || "");

    // Match category name to user's categories
    const matched = categories.find(
      (c) => c.name === result.categoryName && c.type === result.type
    ) ?? categories.find(
      (c) => c.name === result.categoryName || c.name.includes(result.categoryName) || result.categoryName.includes(c.name)
    );
    const catId = matched?.id ?? "";
    if (matched) setCategoryId(matched.id);

    setError("");

    // Auto-submit if we have valid data
    if (result.amountYuan > 0 && catId) {
      ocrSubmitMut.mutate({
        type: result.type,
        amountYuan: result.amountYuan,
        categoryId: catId,
        date: result.date || todayDate(),
        note: result.note || "",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: () => transactionsApi.create({ type, amountYuan: amount, categoryId, date, note }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); queryClient.invalidateQueries({ queryKey: ["stats"] }); navigate(-1); },
    onError: (err: Error) => setError(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: () => transactionsApi.update(editId!, { type, amountYuan: amount, categoryId, date, note } as Parameters<typeof transactionsApi.update>[1]),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); queryClient.invalidateQueries({ queryKey: ["stats"] }); navigate(-1); },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) { setError("请输入有效金额"); return; }
    if (!categoryId) { setError("请选择分类"); return; }
    editId ? updateMutation.mutate() : createMutation.mutate();
  };

  const saving = createMutation.isPending || updateMutation.isPending || ocrSubmitMut.isPending;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col hero-mesh">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => navigate(-1)} className="glass-button rounded-full px-4 py-2 text-[16px] font-medium text-ios-accent active:scale-95 transition">
          取消
        </button>
        <span className="text-[17px] font-semibold text-ios-text">{editId ? "编辑" : "记一笔"}</span>
        <div className="w-14" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-4 pt-4">
        {/* OCR uploader (only for new transactions, not edit) */}
        {!editId && (
          <div className="mb-4">
            <OcrUploader onParsed={handleOcrParsed} />
          </div>
        )}

        <div className="mb-6 flex justify-center">
          <div className="segmented-ios26">
            {(["expense", "income"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId(""); }} className={type === t ? "active" : ""}>
                {t === "expense" ? "💸 支出" : "💰 收入"}
              </button>
            ))}
          </div>
        </div>

        <AmountInput value={amount} onChange={setAmount} disabled={saving} />

        <div className="mt-6">
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} filterType={type} />
        </div>

        <div className="mt-5 space-y-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="glass-card block w-full rounded-2xl px-5 py-4 text-[17px] text-ios-text outline-none transition focus:ring-2 focus:ring-ios-accent/30"
            disabled={saving}
          />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="备注（选填）"
            className="glass-card block w-full rounded-2xl px-5 py-4 text-[17px] text-ios-text placeholder:text-ios-tertiary outline-none transition focus:ring-2 focus:ring-ios-accent/30"
            disabled={saving}
          />
        </div>

        {error && <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[14px] text-ios-danger backdrop-blur-sm">{error}</p>}

        <div className="safe-bottom mt-auto py-4">
          <button type="submit" disabled={saving}
            className="w-full rounded-full bg-ios-accent py-4 text-[17px] font-semibold text-white shadow-lg shadow-ios-accent/25 transition active:scale-[0.98] disabled:opacity-40">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
