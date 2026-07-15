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
  const [search, setSearch] = useState("");

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

  // Filter by search keyword (note or category name)
  const filtered = search.trim()
    ? transactions.filter((tx) => {
        const cat = catMap.get(tx.categoryId);
        const q = search.trim().toLowerCase();
        return tx.note.toLowerCase().includes(q) || (cat?.name ?? "").toLowerCase().includes(q);
      })
    : transactions;
  const grouped = groupByDate(filtered);
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
                  className={`h-full rounded-full transition-all duration-500 ${budgetPercent >= 1 ? "bg-ios-danger" : "bg-gradient-to-r from-ios-accent to-[#5AC8FA]"}`}
                  style={{ width: `${Math.min(100, budgetPercent * 100)}%` }}
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

      {/* Search */}
      {transactions.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索备注或分类"
            className="glass-card block w-full rounded-2xl px-4 py-3 text-[15px] text-ios-text placeholder:text-ios-tertiary outline-none transition focus:bg-white/90"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ios-secondary/15 px-2 py-1 text-[13px] font-medium text-ios-secondary active:bg-ios-secondary/25"
            >
              清除
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {transactions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="glass-accent mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[22px] text-4xl shadow-sm">
            📝
          </div>
          <p className="mt-5 text-[17px] font-semibold text-ios-text">这个月还没有流水</p>
          <p className="mt-1.5 text-[14px] text-ios-secondary leading-relaxed max-w-[240px] mx-auto">
            记录每一笔收支，了解钱花在哪里
          </p>
          <button
            onClick={() => navigate("/transactions/new")}
            className="mt-6 fab-glow inline-flex h-12 items-center gap-2 rounded-full bg-ios-accent px-8 text-[16px] font-semibold text-white shadow-lg shadow-ios-accent/25 transition active:scale-95"
          >
            <span className="text-lg">+</span> 记第一笔
          </button>
          <p className="mt-4 text-[12px] text-ios-tertiary">
            也可以用截图或快捷指令自动记账
          </p>
        </div>
      ) : search && filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[15px] text-ios-secondary">没有匹配「{search}」的流水</p>
          <button onClick={() => setSearch("")} className="mt-2 text-[15px] font-medium text-ios-accent">清除搜索</button>
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
                  {txs.map((tx) => {
                    const cat = catMap.get(tx.categoryId);
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => navigate(`/transactions/new?edit=${tx.id}`)}
                        className="ios-row-glass w-full text-left transition active:bg-black/[0.03]"
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
    </div>
  );
}
