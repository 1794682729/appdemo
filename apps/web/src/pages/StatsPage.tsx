import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentYearMonth, formatCNY } from "@liushui/shared";
import { statsApi } from "../lib/api";
import { MonthSwitcher } from "../components/MonthSwitcher";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4",
  "#f59e0b", "#f97316", "#ef4444", "#8b5cf6", "#3b82f6",
  "#06b6d4", "#10b981", "#84cc16", "#e11d48", "#6366f1",
];

export function StatsPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth());

  const { data: summary } = useQuery({
    queryKey: ["stats", "summary", yearMonth],
    queryFn: () => statsApi.summary(yearMonth),
  });
  const { data: byCategory = [] } = useQuery({
    queryKey: ["stats", "by-category", yearMonth],
    queryFn: () => statsApi.byCategory(yearMonth),
  });
  const { data: trend = [] } = useQuery({
    queryKey: ["stats", "trend"],
    queryFn: () => statsApi.trend(6),
  });

  const pieData = byCategory.map((c) => ({
    name: c.categoryName,
    value: c.totalCents,
    icon: c.categoryIcon,
  }));

  const barData = trend.map((t) => ({
    month: t.yearMonth.slice(5),
    expense: Math.round(t.expense / 100),
    income: Math.round(t.income / 100),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">统计</h1>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "支出", value: formatCNY(summary?.totalExpense ?? 0), color: "text-slate-800" },
          { label: "收入", value: formatCNY(summary?.totalIncome ?? 0), color: "text-green-600" },
          { label: "结余", value: formatCNY(summary?.balance ?? 0), color: "text-teal-700" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100"
          >
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className={`mt-1 text-sm font-semibold ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pie chart */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 text-sm font-medium text-slate-700">分类支出占比</h2>
        {pieData.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">暂无数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => formatCNY(val)}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trend chart */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 text-sm font-medium text-slate-700">近6个月趋势</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              formatter={(val: number) => `¥${val.toLocaleString()}`}
            />
            <Bar dataKey="expense" fill="#0f766e" name="支出" radius={[4, 4, 0, 0]} />
            <Bar dataKey="income" fill="#2dd4bf" name="收入" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
