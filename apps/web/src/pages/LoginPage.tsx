import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { userId, checkAuth, login, register } = useAuthStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (userId) navigate("/", { replace: true }); }, [userId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = mode === "register"
      ? await register(username, password)
      : await login(username, password);
    setSubmitting(false);
    if (!ok) {
      const errMsg = mode === "register" ? "注册失败，用户名可能已被占用" : "用户名或密码错误";
      setError(errMsg);
    }
    await checkAuth();
  };

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
          {mode === "register" ? "创建你的专属账本" : "欢迎回来"}
        </p>
      </div>

      {/* Login / Register tabs */}
      <div className="mt-8 segmented-ios26 flex justify-center">
        {(["login", "register"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(""); }} className={mode === m ? "active" : ""}>
            {m === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          className="glass-card block w-full rounded-2xl px-5 py-4 text-[17px] text-ios-text placeholder:text-ios-tertiary outline-none transition focus:bg-white/90"
          required minLength={2} maxLength={32}
        />
        <input
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 6 位）"
          className="glass-card block w-full rounded-2xl px-5 py-4 text-[17px] text-ios-text placeholder:text-ios-tertiary outline-none transition focus:bg-white/90"
          required minLength={6} maxLength={128}
        />
        {error && (
          <p className="rounded-2xl bg-ios-danger/10 px-4 py-3 text-[14px] text-ios-danger backdrop-blur-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-full bg-ios-accent py-4 text-[17px] font-semibold text-white shadow-lg shadow-ios-accent/20 transition active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? "..." : mode === "register" ? "注册" : "登录"}
        </button>
      </form>
    </div>
  );
}
