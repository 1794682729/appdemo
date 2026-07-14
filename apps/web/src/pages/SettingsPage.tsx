import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi, dataApi } from "../lib/api";
import { useAuthStore } from "../store/auth";

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { username, logout } = useAuthStore();

  const [showAddCat, setShowAddCat] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [importing, setImporting] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      categoriesApi.create({
        name: newName,
        type: newType,
        icon: newIcon,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowAddCat(false);
      setNewName("");
      setNewIcon("📦");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const handleExport = () => {
    dataApi.export();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("导入将覆盖现有数据，确定继续？")) return;

    setImporting(true);
    try {
      await dataApi.import(file);
      queryClient.invalidateQueries();
      alert("导入成功");
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "导入失败",
      );
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const expenseCats = categories.filter(
    (c) => c.type === "expense" || c.type === "both",
  );
  const incomeCats = categories.filter(
    (c) => c.type === "income" || c.type === "both",
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">我的</h1>

      {/* User info */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-500">当前用户</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {username ?? "—"}
        </p>
      </div>

      {/* Categories management */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">分类管理</h2>
          <button
            type="button"
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-sm font-medium text-teal-700"
          >
            {showAddCat ? "取消" : "+ 新增"}
          </button>
        </div>

        {showAddCat && (
          <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="分类名称"
                maxLength={32}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="图标"
                maxLength={4}
                className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-lg outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={[
                    "flex-1 rounded-lg py-1.5 text-xs font-medium",
                    newType === t
                      ? "bg-teal-700 text-white"
                      : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  {t === "expense" ? "支出" : "收入"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addMutation.mutate()}
              disabled={!newName || addMutation.isPending}
              className="w-full rounded-lg bg-teal-700 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              添加
            </button>
          </div>
        )}

        <div className="mt-3 space-y-1">
          <p className="text-xs text-slate-400">支出分类</p>
          {expenseCats.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="flex-1 text-sm text-slate-700">
                {cat.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`删除分类「${cat.name}」？`)) {
                    deleteMutation.mutate(cat.id);
                  }
                }}
                className="text-xs text-red-400"
              >
                删除
              </button>
            </div>
          ))}
          {incomeCats.length > 0 && (
            <>
              <p className="mt-2 text-xs text-slate-400">收入分类</p>
              {incomeCats.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="flex-1 text-sm text-slate-700">
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`删除分类「${cat.name}」？`)) {
                        deleteMutation.mutate(cat.id);
                      }
                    }}
                    className="text-xs text-red-400"
                  >
                    删除
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Data backup */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-3">
        <h2 className="text-sm font-medium text-slate-700">数据备份</h2>
        <button
          type="button"
          onClick={handleExport}
          className="block w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-700 active:bg-slate-50"
        >
          📥 导出 JSON 备份
        </button>

        <label className="block w-full cursor-pointer rounded-lg border border-slate-200 py-2.5 text-center text-sm text-slate-700 active:bg-slate-50">
          {importing ? "导入中..." : "📤 从备份恢复"}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
        </label>

        <p className="text-xs text-slate-400">
          备份文件包含全部分类、流水和预算数据。导入将覆盖现有数据。
        </p>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
        className="w-full rounded-xl border border-red-200 bg-white py-3 text-sm font-medium text-red-600 active:bg-red-50"
      >
        退出登录
      </button>
    </div>
  );
}
