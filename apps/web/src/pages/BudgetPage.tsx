import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { currentYearMonth, formatCNY } from "@liushui/shared";
import { budgetsApi, categoriesApi, statsApi } from "../lib/api";
import { MonthSwitcher } from "../components/MonthSwitcher";

export function BudgetPage() {
  const queryClient = useQueryClient();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [totalInput, setTotalInput] = useState("");
  const [byCategoryInput, setByCategoryInput] = useState<
    Record<string, string>
  >({});
  const [saved, setSaved] = useState(false);

  const { data: budget } = useQuery({
    queryKey: ["budget", yearMonth],
    queryFn: () => budgetsApi.get(yearMonth),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  });
  const { data: summary } = useQuery({
    queryKey: ["stats", "summary", yearMonth],
    queryFn: () => statsApi.summary(yearMonth),
  });

  // Sync local inputs when budget or yearMonth changes
  useEffect(() => {
    if (budget) {
      setTotalInput(
        budget.totalCents != null ? String(budget.totalCents / 100) : "",
      );
      const cats: Record<string, string> = {};
      for (const [catId, cents] of Object.entries(
        budget.byCategory ?? {},
      )) {
        cats[catId] = String((cents as number) / 100);
      }
      setByCategoryInput(cats);
    } else {
      setTotalInput("");
      setByCategoryInput({});
    }
    setSaved(false);
  }, [budget, yearMonth]);

  const mutation = useMutation({
    mutationFn: () =>
      budgetsApi.upsert(yearMonth, {
        totalYuan: totalInput || null,
        byCategoryYuan: Object.fromEntries(
          Object.entries(byCategoryInput).filter(
            ([, v]) => v !== "",
          ),
        ),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const expenseCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "both",
  );

  const totalBudget = budget?.totalCents ?? null;
  const totalUsed = summary?.totalExpense ?? 0;
  const totalPercent =
    totalBudget != null && totalBudget > 0
      ? Math.min(100, Math.round((totalUsed / totalBudget) * 100))
      : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">预算</h1>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      {/* Total budget progress */}
      {totalPercent != null && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">总预算</span>
            <span className="text-slate-700">
              {formatCNY(totalUsed)} / {formatCNY(totalBudget!)}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={[
                "h-full rounded-full transition-all",
                totalPercent >= 100 ? "bg-red-500" : "bg-teal-500",
              ].join(" ")}
              style={{ width: `${totalPercent}%` }}
            />
          </div>
          <p
            className={[
              "mt-1 text-xs",
              totalPercent >= 100
                ? "font-medium text-red-500"
                : "text-slate-400",
            ].join(" ")}
          >
            {totalPercent >= 100 ? "已超支" : `已用 ${totalPercent}%`}
          </p>
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            月度总预算（元）
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={totalInput}
            onChange={(e) => setTotalInput(e.target.value)}
            placeholder="例如：3000"
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
          />
        </div>

        {expenseCategories.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700">
              分类预算（可选）
            </label>
            <div className="mt-2 space-y-2">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="w-16 text-sm text-slate-600">
                    {cat.name}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={byCategoryInput[cat.id] ?? ""}
                    onChange={(e) =>
                      setByCategoryInput((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                    placeholder="金额"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={[
            "w-full rounded-xl py-3 text-sm font-medium transition",
            saved
              ? "bg-green-50 text-green-700"
              : "bg-teal-700 text-white active:bg-teal-800",
          ].join(" ")}
        >
          {mutation.isPending
            ? "保存中..."
            : saved
              ? "✓ 已保存"
              : "保存预算"}
        </button>
      </div>
    </div>
  );
}
