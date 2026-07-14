import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { auth as authApi } from "../lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { userId, checkAuth, login } = useAuthStore();

  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { authApi.status().then((s) => setHasUser(s.hasUser)); }, []);
  useEffect(() => { if (userId) navigate("/", { replace: true }); }, [userId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = hasUser
      ? await login(username, password)
      : await (async () => {
          try { await authApi.setup(username, password); return await login(username, password); }
          catch (err: unknown) { setError(err instanceof Error ? err.message : "初始化失败"); return false; }
        })();
    setSubmitting(false);
    if (!ok) setError(hasUser ? "用户名或密码错误" : "初始化失败");
    await checkAuth();
  };

  if (hasUser === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ios-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ios-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="hero-mesh flex min-h-dvh flex-col justify-center px-6">
      <div className="text-center">
        <div className="glass-card mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[24px] text-4xl shadow-lg">
          💰
        </div>
        <h1 className="mt-6 text-[32px] font-bold text-ios-text tracking-tight">
          流水记账
        </h1>
        <p className="mt-1.5 text-[16px] text-ios-secondary">
          {hasUser ? "欢迎回来" : "开始管理每一笔收支"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-3.5">
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          className="glass-card block w-full rounded-2xl px-5 py-4 text-[17px] text-ios-text placeholder:text-ios-tertiary outline-none transition focus:ring-2 focus:ring-ios-accent/30"
          required minLength={2} maxLength={32}
        />
        <input
          type="password"
          autoComplete={hasUser ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 6 位）"
          className="glass-card block w-full rounded-2xl px-5 py-4 text-[17px] text-ios-text placeholder:text-ios-tertiary outline-none transition focus:ring-2 focus:ring-ios-accent/30"
          required minLength={6} maxLength={128}
        />
        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[14px] text-ios-danger backdrop-blur-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-full bg-ios-accent py-4 text-[17px] font-semibold text-white shadow-lg shadow-ios-accent/20 transition active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? "..." : hasUser ? "登录" : "创建账号"}
        </button>
      </form>
    </div>
  );
}
