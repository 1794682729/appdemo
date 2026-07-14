import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { currentYearMonth, formatCNY } from "@liushui/shared";
import { transactionsApi, statsApi, budgetsApi, categoriesApi, type TransactionDto, type CategoryDto } from "../lib/api";
import { MonthSwitcher } from "../components/MonthSwitcher";

function groupByDate(txs: TransactionDto[]) {
  const m = new Map<string, TransactionDto[]>();
  for (const tx of txs) { const l = m.get(tx.date) || []; l.push(tx); m.set(tx.date, l); }
  return m;
}

export function HomePage() {
  const navigate = useNavigate();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", yearMonth],
    queryFn: () => transactionsApi.getAll(yearMonth),
  });
  const { data: summary } = useQuery({
    queryKey: ["stats", "summary", yearMonth],
    queryFn: () => statsApi.summary(yearMonth),
  });
  const { data: budget } = useQuery({
    queryKey: ["budget", yearMonth],
    queryFn: () => budgetsApi.get(yearMonth),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  });

  const catMap = new Map<string, CategoryDto>();
  for (const c of categories) catMap.set(c.id, c);
  const grouped = groupByDate(transactions);
  const todayStr = new Date().toISOString().slice(0, 10);

  const expense = summary?.totalExpense ?? 0;
  const income = summary?.totalIncome ?? 0;
  const balance = summary?.balance ?? 0;
  const budgetTotal = budget?.totalCents ?? null;
  const budgetPercent = budgetTotal != null && budgetTotal > 0 ? Math.min(1, expense / budgetTotal) : null;

  return (
    <div className="space-y-5">
      {/* iOS 26 Glass Hero Card */}
      <div className="relative mt-2 overflow-hidden rounded-[28px] glass-accent border border-white/30 p-6">
        {/* Depth layers */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-ios-accent/8 via-transparent to-ios-income/6" />
        <div className="relative">
          <p className="text-[13px] font-medium text-ios-accent/70 uppercase tracking-wide">
            {yearMonth.slice(5)} 月结余
          </p>
          <p className="mt-1.5 text-[44px] font-bold text-ios-text tracking-[-0.5px] tabular-nums">
            {formatCNY(balance)}
          </p>

          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-[12px] font-medium text-ios-danger/60 uppercase tracking-wide">支出</p>
              <p className="mt-0.5 text-[18px] font-semibold text-ios-danger tabular-nums">{formatCNY(expense)}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-ios-income/60 uppercase tracking-wide">收入</p>
              <p className="mt-0.5 text-[18px] font-semibold text-ios-income tabular-nums">{formatCNY(income)}</p>
            </div>
          </div>

          {/* Budget ring segment */}
          {budgetPercent != null && (
            <div className="mt-5 border-t border-white/20 pt-4">
              <div className="flex justify-between items-end">
                <span className="text-[12px] text-ios-secondary">月预算 · {formatCNY(budgetTotal!)}</span>
                <span className={`text-[12px] font-semibold ${budgetPercent >= 1 ? "text-ios-danger" : "text-ios-secondary"}`}>
                  {Math.round(budgetPercent * 100)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/8">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, budgetPercent * 100)}%`,
                    background: budgetPercent >= 1
                      ? "#FF3B30"
                      : "linear-gradient(90deg, #0A84FF, #5AC8FA)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />
        <button
          onClick={() => navigate("/transactions/new")}
          className="fab-glow flex h-11 w-11 items-center justify-center rounded-full bg-ios-accent text-2xl font-light text-white transition active:scale-90"
        >
          +
        </button>
      </div>

      {/* Empty */}
      {transactions.length === 0 ? (
        <div className="py-16 text-center">
          <div className="glass-card mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl">
            📝
          </div>
          <p className="mt-4 text-[16px] text-ios-secondary">这个月还没有流水</p>
          <button onClick={() => navigate("/transactions/new")} className="mt-2 text-[15px] font-medium text-ios-accent">
            记第一笔
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([date, txs]) => {
            const dayTotal = txs.reduce((s, t) => s + (t.type === "expense" ? -t.amountCents : t.amountCents), 0);
            const isToday = date === todayStr;
            return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-[13px] font-semibold text-ios-secondary">
                    {isToday ? "今天" : `${Number(date.slice(5,7))}月${Number(date.slice(8,10))}日`}
                  </span>
                  <span className="text-[13px] text-ios-secondary tabular-nums">结余 {formatCNY(dayTotal)}</span>
                </div>

                <div className="glass-card overflow-hidden rounded-2xl">
                  {txs.map((tx, j) => {
                    const cat = catMap.get(tx.categoryId);
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => navigate(`/transactions/new?edit=${tx.id}`)}
                        className="ios-row-glass w-full text-left transition active:bg-black/[0.03]"
                        style={j < txs.length - 1 ? { borderBottom: "0.5px solid rgba(60,60,67,0.08)" } : undefined}
                      >
                        <div className="glass-accent flex h-10 w-10 items-center justify-center rounded-full text-lg">
                          {cat?.icon ?? "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[17px] font-medium text-ios-text">{cat?.name ?? "未知"}</p>
                          {tx.note && <p className="truncate text-[13px] text-ios-secondary">{tx.note}</p>}
                        </div>
                        <span className={`text-[17px] font-semibold tabular-nums ${tx.type === "income" ? "text-ios-income" : "text-ios-text"}`}>
                          {tx.type === "expense" ? "−" : "+"}{formatCNY(tx.amountCents)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
