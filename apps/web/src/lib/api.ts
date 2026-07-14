const BASE = "/api";

let authToken: string | null = null;

export function setAuthToken(t: string | null) {
  authToken = t;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { rawResponse?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = await res.json();
      message = err.error ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  if (opts?.rawResponse) return res as unknown as T;

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Auth
export const auth = {
  status: () => request<{ hasUser: boolean }>("GET", "/auth/status"),
  setup: (username: string, password: string) =>
    request<{ id: string; username: string }>("POST", "/auth/setup", {
      username,
      password,
    }),
  login: (username: string, password: string) =>
    request<{ id: string; username: string }>("POST", "/auth/login", {
      username,
      password,
    }),
  logout: () => request<{ ok: boolean }>("POST", "/auth/logout"),
  me: () => request<{ id: string; username: string }>("GET", "/auth/me"),
};

// Categories
export type CategoryDto = {
  id: string;
  name: string;
  type: "expense" | "income" | "both";
  icon: string;
  sort: number;
  createdAt: string;
};

export const categoriesApi = {
  getAll: () => request<CategoryDto[]>("GET", "/categories"),
  create: (data: { name: string; type: string; icon: string; sort?: number }) =>
    request<CategoryDto>("POST", "/categories", data),
  update: (id: string, data: Partial<CategoryDto>) =>
    request<CategoryDto>("PATCH", `/categories/${id}`, data),
  remove: (id: string) =>
    request<{ ok: boolean }>("DELETE", `/categories/${id}`),
};

// Transactions
export type TransactionDto = {
  id: string;
  type: "expense" | "income";
  amountCents: number;
  categoryId: string;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export const transactionsApi = {
  getAll: (yearMonth: string) =>
    request<TransactionDto[]>("GET", `/transactions?yearMonth=${yearMonth}`),
  create: (data: {
    type: string;
    amountYuan: number | string;
    categoryId: string;
    date: string;
    note?: string;
  }) => request<TransactionDto>("POST", "/transactions", data),
  update: (id: string, data: Partial<TransactionDto>) =>
    request<TransactionDto>("PATCH", `/transactions/${id}`, data),
  remove: (id: string) =>
    request<{ ok: boolean }>("DELETE", `/transactions/${id}`),
};

// Stats
export type SummaryDto = {
  totalExpense: number;
  totalIncome: number;
  balance: number;
};

export type ByCategoryDto = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  totalCents: number;
}[];

export type TrendDto = {
  yearMonth: string;
  expense: number;
  income: number;
}[];

export const statsApi = {
  summary: (yearMonth: string) =>
    request<SummaryDto>("GET", `/stats/summary?yearMonth=${yearMonth}`),
  byCategory: (yearMonth: string) =>
    request<ByCategoryDto>("GET", `/stats/by-category?yearMonth=${yearMonth}`),
  trend: (months = 6) =>
    request<TrendDto>("GET", `/stats/trend?months=${months}`),
};

// Budgets
export type BudgetDto = {
  id: string;
  yearMonth: string;
  totalCents: number | null;
  byCategory: Record<string, number>;
};

export const budgetsApi = {
  get: (yearMonth: string) =>
    request<BudgetDto | null>("GET", `/budgets/${yearMonth}`),
  upsert: (yearMonth: string, data: {
    totalYuan?: number | string | null;
    byCategoryYuan?: Record<string, number | string>;
  }) => request<BudgetDto>("PUT", `/budgets/${yearMonth}`, data),
};

// Export/Import
export const dataApi = {
  export: () =>
    request<unknown>("GET", "/export", undefined, { rawResponse: true })
      .then((res) => (res as Response).blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `liushui-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }),

  import: (file: File) =>
    file
      .text()
      .then((text) => JSON.parse(text))
      .then((data) =>
        request<{ ok: boolean }>("POST", "/import", data),
      ),
};
