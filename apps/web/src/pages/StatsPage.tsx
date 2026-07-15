import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentYearMonth, formatCNY } from "@liushui/shared";
import { statsApi } from "../lib/api";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// Derived from iOS semantic palette: Blue family → Green family → Red family → Gray
const COLORS = ["#0A84FF", "#007AFF", "#5AC8FA", "#34C759", "#30D158", "#FF3B30", "#FF6B64", "#8E8E93"];

export function StatsPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const { data: summary } = useQuery({ queryKey: ["stats", "summary", yearMonth], queryFn: () => statsApi.summary(yearMonth) });
  const { data: byCategory = [] } = useQuery({ queryKey: ["stats", "by-category", yearMonth], queryFn: () => statsApi.byCategory(yearMonth) });
  const { data: trend = [] } = useQuery({ queryKey: ["stats", "trend"], queryFn: () => statsApi.trend(6) });

  const pieData = byCategory.map((c) => ({ name: c.categoryName, value: c.totalCents }));
  const barData = trend.map((t) => ({ month: `${Number(t.yearMonth.slice(5,7))}月`, expense: Math.round(t.expense/100), income: Math.round(t.income/100) }));

  return (
    <div className="space-y-5">
      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "支出", val: formatCNY(summary?.totalExpense ?? 0), cls: "text-ios-danger" },
          { label: "收入", val: formatCNY(summary?.totalIncome ?? 0), cls: "text-ios-income" },
          { label: "结余", val: formatCNY(summary?.balance ?? 0), cls: "text-ios-accent" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-2xl px-3 py-4 text-center">
            <p className="text-[12px] text-ios-secondary">{item.label}</p>
            <p className={`mt-1 text-[16px] font-bold tabular-nums ${item.cls}`}>{item.val}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-1 text-[15px] font-semibold text-ios-text">分类支出</h2>
        {pieData.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-ios-tertiary">暂无数据</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={52}>
                  {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCNY(val)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {pieData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center gap-1 text-[11px] text-ios-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-1 text-[15px] font-semibold text-ios-text">近 6 月趋势</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} barGap={4}>
            <CartesianGrid stroke="rgba(60,60,67,0.06)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#8E8E93" }} axisLine={false} tickLine={false} width={45} />
            <Tooltip formatter={(val: number) => `¥${val.toLocaleString()}`} />
            <Bar dataKey="expense" fill="#FF3B30" name="支出" radius={[6,6,0,0]} />
            <Bar dataKey="income" fill="#34C759" name="收入" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
