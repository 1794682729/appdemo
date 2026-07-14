import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { currentYearMonth, formatCNY } from "@liushui/shared";
import { budgetsApi, categoriesApi, statsApi } from "../lib/api";
import { MonthSwitcher } from "../components/MonthSwitcher";

export function BudgetPage() {
  const queryClient = useQueryClient();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [totalInput, setTotalInput] = useState("");
  const [byCat, setByCat] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: budget } = useQuery({ queryKey: ["budget", yearMonth], queryFn: () => budgetsApi.get(yearMonth) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.getAll });
  const { data: summary } = useQuery({ queryKey: ["stats", "summary", yearMonth], queryFn: () => statsApi.summary(yearMonth) });

  useEffect(() => {
    if (budget) {
      setTotalInput(budget.totalCents != null ? String(budget.totalCents / 100) : "");
      const c: Record<string, string> = {};
      for (const [k, v] of Object.entries(budget.byCategory ?? {})) c[k] = String((v as number) / 100);
      setByCat(c);
    } else { setTotalInput(""); setByCat({}); }
    setSaved(false);
  }, [budget, yearMonth]);

  const mut = useMutation({
    mutationFn: () => budgetsApi.upsert(yearMonth, { totalYuan: totalInput || null, byCategoryYuan: Object.fromEntries(Object.entries(byCat).filter(([,v]) => v !== "")) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budget"] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const expenseCats = categories.filter((c) => c.type === "expense" || c.type === "both");
  const totalBudget = budget?.totalCents ?? null;
  const totalUsed = summary?.totalExpense ?? 0;
  const totalPct = totalBudget != null && totalBudget > 0 ? Math.min(100, Math.round((totalUsed / totalBudget) * 100)) : null;

  return (
    <div className="space-y-5">
      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      {totalPct != null && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[13px] text-ios-secondary uppercase tracking-wide">预算已用</p>
          <p className="mt-2 text-[40px] font-bold text-ios-text tracking-[-0.5px] tabular-nums">{totalPct}%</p>
          <p className="mt-1 text-[14px] text-ios-secondary">{formatCNY(totalUsed)} / {formatCNY(totalBudget!)}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/6">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${totalPct}%`, background: totalPct >= 100 ? "#FF3B30" : "linear-gradient(90deg, #0A84FF, #5AC8FA)" }} />
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-[15px] font-semibold text-ios-text">月度总预算</label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[18px] text-ios-secondary">¥</span>
            <input type="text" inputMode="decimal" value={totalInput} onChange={(e) => setTotalInput(e.target.value)}
              placeholder="3000"
              className="flex-1 rounded-2xl bg-black/[0.04] px-4 py-3.5 text-[17px] text-ios-text outline-none transition focus:ring-2 focus:ring-ios-accent/30 placeholder:text-ios-tertiary" />
          </div>
        </div>

        {expenseCats.length > 0 && (
          <div>
            <label className="text-[15px] font-semibold text-ios-text">分类预算（可选）</label>
            <div className="mt-2 space-y-2">
              {expenseCats.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="w-16 text-[15px] text-ios-text">{cat.name}</span>
                  <input type="text" inputMode="decimal" value={byCat[cat.id] ?? ""}
                    onChange={(e) => setByCat((p) => ({ ...p, [cat.id]: e.target.value }))}
                    placeholder="¥"
                    className="flex-1 rounded-2xl bg-black/[0.04] px-4 py-3 text-[15px] text-ios-text outline-none transition focus:ring-2 focus:ring-ios-accent/30 placeholder:text-ios-tertiary" />
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}
          className={["w-full rounded-full py-4 text-[17px] font-semibold transition active:scale-[0.98]", saved ? "glass-accent text-ios-accent" : "bg-ios-accent text-white shadow-lg shadow-ios-accent/20"].join(" ")}>
          {mut.isPending ? "保存中..." : saved ? "✓ 已保存" : "保存预算"}
        </button>
      </div>
    </div>
  );
}
