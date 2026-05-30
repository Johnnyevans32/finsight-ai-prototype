const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

let csrfToken: string | null = null

async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken
  const res = await fetch(`${API_BASE}/csrf/`, { credentials: "include" })
  if (!res.ok) throw new Error("Could not get CSRF token")
  const data = await res.json()
  csrfToken = data.csrfToken as string
  return csrfToken
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  }
  if (!["GET", "HEAD"].includes(method)) {
    headers["X-CSRFToken"] = await ensureCsrf()
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  })
  if (res.status === 204) return undefined as unknown as T
  if (res.status === 401) {
    const PUBLIC = ["/", "/login", "/register"]
    if (!PUBLIC.includes(window.location.pathname)) {
      window.location.replace("/login")
    }
    return undefined as unknown as T
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err: any = new Error(data?.detail ?? `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data as T
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  locale: string
  date_joined: string
}

export interface FinancialAccount {
  id: string
  institution_name: string
  account_type: string
  currency: string
  balance_current_minor: number
  balance_available_minor: number | null
  mono_account_id: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  account: string
  account_name: string
  category: string | null
  category_name: string | null
  merchant_name: string
  description: string
  amount_minor: number
  currency: string
  status: string
  booked_at: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  kind: "income" | "expense" | "transfer"
  is_system: boolean
}

export interface SavingsGoal {
  id: string
  name: string
  target_minor: number
  current_minor: number
  currency: string
  due_date: string | null
  status: "active" | "completed" | "paused"
  progress_percent: number
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: number
  category: string
  category_name: string
  limit_minor: number
}

export interface Budget {
  id: string
  period_start: string
  period_end: string
  currency: string
  total_limit_minor: number | null
  budget_categories: BudgetCategory[]
  created_at: string
  updated_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<User>("/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (email: string, full_name: string, password: string) =>
      apiFetch<User>("/auth/register/", {
        method: "POST",
        body: JSON.stringify({ email, full_name, password, locale: "en-NG" }),
      }),
    logout: () => apiFetch<{ detail: string }>("/auth/logout/", { method: "POST", body: "{}" }),
    me: () => apiFetch<User>("/auth/me/"),
    updateMe: (data: Partial<Pick<User, "full_name" | "email" | "locale">>) =>
      apiFetch<User>("/auth/me/", { method: "PATCH", body: JSON.stringify(data) }),
    changePassword: (old_password: string, new_password: string) =>
      apiFetch<{ detail: string }>("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({ old_password, new_password }),
      }),
  },

  notifications: {
    list: () =>
      apiFetch<Array<{ id: string; type: "warning" | "info" | "success"; title: string; body: string }>>(
        "/notifications/"
      ),
  },

  accounts: {
    list: () => apiFetch<Paginated<FinancialAccount>>("/accounts/"),
    retrieve: (id: string) => apiFetch<FinancialAccount>(`/accounts/${id}/`),
    delete: (id: string) => apiFetch<void>(`/accounts/${id}/`, { method: "DELETE" }),
  },

  transactions: {
    list: (params?: {
      account?: string
      category?: string
      status?: string
      page?: number
      no_page?: boolean
      date_from?: string
      date_to?: string
    }) => {
      const qs = new URLSearchParams()
      if (params?.account) qs.set("account", params.account)
      if (params?.category) qs.set("category", params.category)
      if (params?.status) qs.set("status", params.status)
      if (params?.page) qs.set("page", String(params.page))
      if (params?.no_page) qs.set("no_page", "1")
      if (params?.date_from) qs.set("date_from", params.date_from)
      if (params?.date_to) qs.set("date_to", params.date_to)
      const q = qs.toString()
      return apiFetch<Paginated<Transaction> | Transaction[]>(`/transactions/${q ? `?${q}` : ""}`)
    },
    retrieve: (id: string) => apiFetch<Transaction>(`/transactions/${id}/`),
    update: (id: string, data: Partial<Pick<Transaction, "category" | "merchant_name" | "description" | "status">>) =>
      apiFetch<Transaction>(`/transactions/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/transactions/${id}/`, { method: "DELETE" }),
  },

  categories: {
    list: () => apiFetch<Paginated<Category>>("/categories/"),
    create: (data: { name: string; kind: "income" | "expense" | "transfer" }) =>
      apiFetch<Category>("/categories/", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/categories/${id}/`, { method: "DELETE" }),
  },

  budgets: {
    list: () => apiFetch<Paginated<Budget>>("/budgets/"),
    retrieve: (id: string) => apiFetch<Budget>(`/budgets/${id}/`),
    create: (data: {
      period_start: string
      period_end: string
      currency?: string
      total_limit_minor?: number
    }) =>
      apiFetch<Budget>("/budgets/", {
        method: "POST",
        body: JSON.stringify({ currency: "NGN", ...data }),
      }),
    update: (id: string, data: Partial<Pick<Budget, "period_start" | "period_end" | "currency" | "total_limit_minor">>) =>
      apiFetch<Budget>(`/budgets/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/budgets/${id}/`, { method: "DELETE" }),
  },

  goals: {
    list: () => apiFetch<Paginated<SavingsGoal>>("/goals/"),
    create: (data: { name: string; target_minor: number; currency?: string; due_date?: string }) =>
      apiFetch<SavingsGoal>("/goals/", {
        method: "POST",
        body: JSON.stringify({ currency: "NGN", ...data }),
      }),
    update: (id: string, data: Partial<Pick<SavingsGoal, "name" | "target_minor" | "current_minor" | "currency" | "due_date" | "status">>) =>
      apiFetch<SavingsGoal>(`/goals/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/goals/${id}/`, { method: "DELETE" }),
    deposit: (id: string, amount_minor: number) =>
      apiFetch<SavingsGoal>(`/goals/${id}/deposit/`, {
        method: "POST",
        body: JSON.stringify({ amount_minor }),
      }),
  },

  mono: {
    initiate: (redirectUrl?: string) =>
      apiFetch<{ mono_url: string; customer_id: string; ref: string }>("/mono/initiate/", {
        method: "POST",
        body: JSON.stringify({ redirect_url: redirectUrl }),
      }),
    exchange: (code: string) =>
      apiFetch<FinancialAccount>("/mono/exchange/", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
  },

  ai: {
    chat: (question: string) =>
      apiFetch<{ response: string; category: string; tips: string[] }>("/ai/chat/", {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
    financialIntelligence: () =>
      apiFetch<{
        financial_health_score: number;
        risk_level: "low" | "moderate" | "high" | "critical";
        future_predictions: {
          balance_3_months: number;
          balance_6_months: number;
          balance_12_months: number;
        };
        spending_insights: {
          biggest_expense_category: string;
          spending_trend: "increasing" | "stable" | "decreasing";
          monthly_burn_rate: number;
        };
        smart_alerts: Array<{
          type: "warning" | "opportunity" | "danger" | "success";
          message: string;
          priority: "low" | "medium" | "high" | "urgent";
        }>;
        investment_opportunities: string[];
        financial_stress_indicators: {
          stress_level: "minimal" | "low" | "moderate" | "high" | "severe";
          key_stressors: string[];
        };
        actionable_recommendations: string[];
        analysis_timestamp: string;
        data_points_analyzed: {
          accounts: number;
          transactions: number;
          time_period_days: number;
          goals: number;
        };
      }>("/ai/financial-intelligence/"),
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCurrency(minor: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(minor) / 100)
}

export function isDebit(amount_minor: number) {
  return amount_minor < 0
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const h = Math.floor(diffMs / 3_600_000)
  const d = Math.floor(diffMs / 86_400_000)
  if (h < 1) return "Just now"
  if (h < 24) return `${h}h ago`
  if (d === 1) return "Yesterday"
  if (d < 7) return `${d} days ago`
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" })
}

export function getFirstName(fullName: string): string {
  return fullName?.split(" ")[0] ?? "there"
}
