import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todayDate } from "@liushui/shared";
import { categoriesApi, transactionsApi } from "../lib/api";
import { AmountInput } from "../components/AmountInput";
import { CategoryPicker } from "../components/CategoryPicker";

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
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  });

  // If editing, load transaction
  const { data: editTx } = useQuery({
    queryKey: ["transaction", editId],
    queryFn: async () => {
      // For simplicity, we fetch all for current month and find the one
      // In practice, you'd add a GET /api/transactions/:id endpoint
      const txs = await transactionsApi.getAll(date.slice(0, 7));
      return txs.find((t) => t.id === editId) ?? null;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (editTx) {
      setType(editTx.type);
      setAmount((editTx.amountCents / 100).toString());
      setCategoryId(editTx.categoryId);
      setDate(editTx.date);
      setNote(editTx.note);
    }
  }, [editTx]);

  const createMutation = useMutation({
    mutationFn: () =>
      transactionsApi.create({
        type,
        amountYuan: amount,
        categoryId,
        date,
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      navigate(-1);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      transactionsApi.update(editId!, {
        type,
        amountYuan: amount,
        categoryId,
        date,
        note,
      } as Parameters<typeof transactionsApi.update>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      navigate(-1);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("请输入有效金额");
      return;
    }
    if (!categoryId) {
      setError("请选择分类");
      return;
    }

    if (editId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="py-2 text-teal-700 text-sm font-medium"
        >
          取消
        </button>
        <span className="text-base font-semibold text-slate-900">
          {editId ? "编辑" : "记一笔"}
        </span>
        <div className="w-10" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col px-4 pt-4"
      >
        {/* Type toggle */}
        <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={[
                "flex-1 rounded-lg py-2 text-sm font-medium transition",
                type === t
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500",
              ].join(" ")}
            >
              {t === "expense" ? "支出" : "收入"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <AmountInput
          value={amount}
          onChange={setAmount}
          disabled={saving}
        />

        {/* Category */}
        <div className="mt-4">
          <CategoryPicker
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
            filterType={type}
          />
        </div>

        {/* Date & Note */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">备注（可选）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="例如：和同事吃午餐"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 placeholder:text-slate-300"
              disabled={saving}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Save */}
        <div className="safe-bottom mt-auto py-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-teal-700 py-3.5 text-base font-medium text-white transition active:bg-teal-800 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
