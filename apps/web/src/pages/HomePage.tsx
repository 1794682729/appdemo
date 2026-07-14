import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { currentYearMonth, formatCNY } from "@liushui/shared";
import {
  transactionsApi,
  statsApi,
  budgetsApi,
  categoriesApi,
  type TransactionDto,
  type CategoryDto,
} from "../lib/api";
import { MonthSwitcher } from "../components/MonthSwitcher";

function groupByDate(txs: TransactionDto[]) {
  const map = new Map<string, TransactionDto[]>();
  for (const tx of txs) {
    const list = map.get(tx.date) || [];
    list.push(tx);
    map.set(tx.date, list);
  }
  return map;
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

  const budgetTotal = budget?.totalCents ?? null;
  const budgetUsed = summary?.totalExpense ?? 0;
  const budgetPercent =
    budgetTotal != null && budgetTotal > 0
      ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100))
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">流水记账</p>
          <h1 className="text-2xl font-semibold text-slate-900">首页</h1>
        </div>
        <button
          onClick={() => navigate("/transactions/new")}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white active:bg-teal-800"
        >
          + 记一笔
        </button>
      </header>

      {/* Month Switcher */}
      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      {/* Summary Card */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>本月支出</span>
          <span>本月收入</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xl font-semibold text-slate-900">
            {formatCNY(summary?.totalExpense ?? 0)}
          </span>
          <span className="text-lg text-slate-600">
            {formatCNY(summary?.totalIncome ?? 0)}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          结余 {formatCNY(summary?.balance ?? 0)}
        </div>

        {/* Budget progress */}
        {budgetPercent != null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>月预算 {formatCNY(budgetTotal!)}</span>
              <span className={budgetPercent >= 100 ? "text-red-500 font-medium" : ""}>
                {budgetPercent}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={[
                  "h-full rounded-full transition-all",
                  budgetPercent >= 100 ? "bg-red-500" : "bg-teal-500",
                ].join(" ")}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions list */}
      <div>
        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl">📝</p>
            <p className="mt-3 text-sm text-slate-400">这个月还没有流水</p>
            <button
              onClick={() => navigate("/transactions/new")}
              className="mt-2 text-sm font-medium text-teal-700"
            >
              记第一笔 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([date, txs]) => {
              const dayTotal = txs.reduce(
                (sum, t) =>
                  sum + (t.type === "expense" ? -t.amountCents : t.amountCents),
                0,
              );
              const isToday = date === todayStr;

              return (
                <div key={date}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-slate-400">
                      {isToday ? "今天" : date.slice(5)}
                    </span>
                    <span
                      className={[
                        "text-xs",
                        dayTotal > 0 ? "text-green-600" : "text-slate-400",
                      ].join(" ")}
                    >
                      {dayTotal > 0 ? "收入 " : "支出 "}
                      {formatCNY(Math.abs(dayTotal))}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {txs.map((tx) => {
                      const cat = catMap.get(tx.categoryId);
                      return (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/transactions/new?edit=${tx.id}`,
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-50 active:bg-slate-50"
                        >
                          <span className="text-xl">
                            {cat?.icon ?? "📦"}
                          </span>
                          <div className="flex-1 text-left min-w-0">
                            <p className="truncate text-sm text-slate-800">
                              {cat?.name ?? "未知分类"}
                            </p>
                            {tx.note && (
                              <p className="truncate text-xs text-slate-400">
                                {tx.note}
                              </p>
                            )}
                          </div>
                          <span
                            className={[
                              "text-sm font-medium",
                              tx.type === "expense"
                                ? "text-slate-800"
                                : "text-green-600",
                            ].join(" ")}
                          >
                            {tx.type === "expense" ? "-" : "+"}
                            {formatCNY(tx.amountCents)}
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
      </div>
    </div>
  );
}
