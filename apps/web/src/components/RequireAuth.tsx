import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { userId, loading, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!userId && loading) {
      checkAuth();
    }
  }, [userId, loading, checkAuth]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
