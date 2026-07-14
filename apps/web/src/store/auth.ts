import { create } from "zustand";
import { auth as authApi } from "../lib/api";

interface AuthState {
  userId: string | null;
  username: string | null;
  loading: boolean;

  checkAuth: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  loading: true,

  async checkAuth() {
    try {
      const user = await authApi.me();
      set({ userId: user.id, username: user.username, loading: false });
      return true;
    } catch {
      set({ userId: null, username: null, loading: false });
      return false;
    }
  },

  async login(username: string, password: string) {
    try {
      const user = await authApi.login(username, password);
      set({ userId: user.id, username: user.username });
      return true;
    } catch {
      return false;
    }
  },

  async logout() {
    await authApi.logout();
    set({ userId: null, username: null });
  },
}));
