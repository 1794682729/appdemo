import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi, dataApi } from "../lib/api";
import { useAuthStore } from "../store/auth";

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { username, logout } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [importing, setImporting] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.getAll });

  const addMut = useMutation({
    mutationFn: () => categoriesApi.create({ name: newName, type: newType, icon: newIcon }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setShowAdd(false); setNewName(""); setNewIcon("📦"); },
  });
  const delMut = useMutation({ mutationFn: (id: string) => categoriesApi.remove(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }) });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; if (!confirm("导入将覆盖现有数据，确定？")) return;
    setImporting(true);
    try { await dataApi.import(f); queryClient.invalidateQueries(); alert("导入成功"); } catch (err: unknown) { alert(err instanceof Error ? err.message : "导入失败"); }
    finally { setImporting(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-5">
      {/* Avatar card */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="glass-accent mx-auto flex h-18 w-18 items-center justify-center rounded-[22px] text-4xl">👤</div>
        <p className="mt-3 text-[18px] font-semibold text-ios-text">{username ?? "—"}</p>
        <p className="mt-0.5 text-[13px] text-ios-secondary">个人记账</p>
      </div>

      {/* Categories */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[17px] font-medium text-ios-text">分类管理</span>
          <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-[15px] font-medium text-ios-accent">
            {showAdd ? "完成" : "新增"}
          </button>
        </div>
        {showAdd && (
          <div className="border-t border-black/[0.06] bg-black/[0.02] px-5 py-4 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称" maxLength={32}
                className="flex-1 glass-card rounded-xl px-4 py-3 text-[15px] outline-none" />
              <input type="text" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="图标" maxLength={4}
                className="w-16 glass-card rounded-xl px-2 py-3 text-center text-lg outline-none" />
            </div>
            <div className="segmented-ios26 flex justify-center">
              {(["expense", "income"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setNewType(t)} className={newType === t ? "active" : ""}>
                  {t === "expense" ? "支出" : "收入"}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => addMut.mutate()} disabled={!newName || addMut.isPending}
              className="w-full rounded-full bg-ios-accent py-3 text-[15px] font-medium text-white disabled:opacity-40">添加</button>
          </div>
        )}

        <div className="border-t border-black/[0.06]">
          <p className="px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-ios-tertiary">支出</p>
          {categories.filter((c) => c.type === "expense" || c.type === "both").map((cat) => (
            <div key={cat.id} className="ios-row-glass">
              <span className="text-lg">{cat.icon}</span><span className="flex-1 text-[17px] text-ios-text">{cat.name}</span>
              <button type="button" onClick={() => { if (confirm(`删除「${cat.name}」？`)) delMut.mutate(cat.id); }} className="text-[14px] text-ios-danger">删除</button>
            </div>
          ))}
        </div>

        {categories.some((c) => c.type === "income") && (
          <div className="border-t border-black/[0.06]">
            <p className="px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-ios-tertiary">收入</p>
            {categories.filter((c) => c.type === "income").map((cat) => (
              <div key={cat.id} className="ios-row-glass">
                <span className="text-lg">{cat.icon}</span><span className="flex-1 text-[17px] text-ios-text">{cat.name}</span>
                <button type="button" onClick={() => { if (confirm(`删除「${cat.name}」？`)) delMut.mutate(cat.id); }} className="text-[14px] text-ios-danger">删除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <button type="button" onClick={() => dataApi.export()} className="ios-row-glass w-full text-left">
          <span className="text-xl">📥</span><span className="flex-1 text-[17px] text-ios-text">导出备份</span><span className="text-[14px] text-ios-tertiary">JSON</span>
        </button>
        <label className="ios-row-glass cursor-pointer">
          <span className="text-xl">📤</span><span className="flex-1 text-[17px] text-ios-text">{importing ? "导入中..." : "从备份恢复"}</span><span className="text-[14px] text-ios-tertiary">JSON</span>
          <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
        </label>
      </div>

      <button type="button"
        onClick={async () => { await logout(); navigate("/login", { replace: true }); }}
        className="glass-card w-full rounded-2xl py-4 text-[17px] font-medium text-ios-danger text-center active:bg-red-500/5">
        退出登录
      </button>
      <div className="h-4" />
    </div>
  );
}
