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

  useEffect(() => {
    authApi.status().then((s) => setHasUser(s.hasUser));
  }, []);

  useEffect(() => {
    if (userId) navigate("/", { replace: true });
  }, [userId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const ok = hasUser
      ? await login(username, password)
      : await (async () => {
          try {
            await authApi.setup(username, password);
            return await login(username, password);
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : "初始化失败";
            setError(msg);
            return false;
          }
        })();

    setSubmitting(false);
    if (!ok) {
      setError(hasUser ? "登录失败，请检查用户名和密码" : "初始化失败");
    }
    await checkAuth();
  };

  if (hasUser === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h1 className="text-center text-xl font-semibold text-slate-900">
          {hasUser ? "登录" : "首次使用 · 创建账号"}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          {hasUser ? "输入你的账号和密码" : "设置用户名和密码，仅你一人使用"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              用户名
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="输入用户名"
              required
              minLength={2}
              maxLength={32}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              密码
            </label>
            <input
              type="password"
              autoComplete={hasUser ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="输入密码（至少6位）"
              required
              minLength={6}
              maxLength={128}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-teal-700 py-3 text-base font-medium text-white transition active:bg-teal-800 disabled:opacity-50"
          >
            {submitting
              ? "处理中..."
              : hasUser
                ? "登录"
                : "创建账号"}
          </button>
        </form>
      </div>
    </div>
  );
}
