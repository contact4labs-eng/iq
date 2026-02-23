/**
 * Shared, cacheable Supabase RPC query hooks using @tanstack/react-query.
 *
 * These replace the duplicated useState/useEffect pattern across hooks
 * like useDashboardData and useFinanceData, giving us automatic:
 *  - Request deduplication (same RPC called from 2 pages → 1 network call)
 *  - Cache sharing across components
 *  - Background refetch & stale-while-revalidate
 *  - Retry logic (configured in App.tsx QueryClient)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

/** Safely extract the first row from an RPC response that may return a single object or array */
function pickFirst(data: unknown): Record<string, unknown> | null {
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

/** Convert all numeric-looking values in an object to numbers */
function safeNumbers(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = typeof v === "number" || (typeof v === "string" && !isNaN(Number(v))) ? safe(v) : v;
  }
  return result;
}

// ─── Daily KPIs ───────────────────────────────────────────
export interface DailyKpis {
  cash_position: number;
  pending_outgoing: number;
  mtd_profit: number;
  overdue_amount: number;
  cash_position_trend?: number;
  pending_outgoing_trend?: number;
  mtd_profit_trend?: number;
  overdue_trend?: number;
  today_revenue?: number;
  today_expenses?: number;
  today_profit?: number;
}

export function useDailyKpis() {
  const { company } = useAuth();
  return useQuery<DailyKpis | null>({
    queryKey: ["rpc", "get_daily_kpis", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase.rpc("get_daily_kpis", { p_company_id: company.id });
      if (error) throw error;
      const row = pickFirst(data);
      if (!row) return null;
      const s = safeNumbers(row);
      return {
        cash_position: safe(s.cash_position),
        pending_outgoing: safe(s.pending_outgoing),
        mtd_profit: safe(s.mtd_profit),
        overdue_amount: safe(s.overdue_amount),
        cash_position_trend: s.cash_position_trend != null ? safe(s.cash_position_trend) : undefined,
        pending_outgoing_trend: s.pending_outgoing_trend != null ? safe(s.pending_outgoing_trend) : undefined,
        mtd_profit_trend: s.mtd_profit_trend != null ? safe(s.mtd_profit_trend) : undefined,
        overdue_trend: s.overdue_trend != null ? safe(s.overdue_trend) : undefined,
        today_revenue: s.today_revenue != null ? safe(s.today_revenue) : undefined,
        today_expenses: s.today_expenses != null ? safe(s.today_expenses) : undefined,
        today_profit: s.today_profit != null ? safe(s.today_profit) : undefined,
      };
    },
    enabled: !!company?.id,
  });
}

// ─── Weekly KPIs ──────────────────────────────────────────
export interface WeeklyKpis {
  revenue: number;
  expenses: number;
  profit: number;
  prev_revenue?: number;
  prev_expenses?: number;
  prev_profit?: number;
  this_week_revenue?: number;
  this_week_expenses?: number;
  this_week_profit?: number;
  last_week_revenue?: number;
  last_week_expenses?: number;
  last_week_profit?: number;
  revenue_change_pct?: number;
  expenses_change_pct?: number;
  profit_change_pct?: number;
}

export function useWeeklyKpis() {
  const { company } = useAuth();
  return useQuery<WeeklyKpis | null>({
    queryKey: ["rpc", "get_weekly_kpis", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase.rpc("get_weekly_kpis", { p_company_id: company.id });
      if (error) throw error;
      const row = pickFirst(data);
      if (!row) return null;
      const s = safeNumbers(row);
      return s as unknown as WeeklyKpis;
    },
    enabled: !!company?.id,
  });
}

// ─── Monthly KPIs ─────────────────────────────────────────
export interface MonthlyKpis {
  net_profit: number;
  margin_pct: number;
  revenue_total: number;
  expenses_total: number;
  revenue_growth_rate: number;
  expense_growth_rate: number;
}

export function useMonthlyKpis() {
  const { company } = useAuth();
  return useQuery<MonthlyKpis | null>({
    queryKey: ["rpc", "get_monthly_kpis", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase.rpc("get_monthly_kpis", { p_company_id: company.id });
      if (error) throw error;
      const row = pickFirst(data);
      if (!row) return null;
      return safeNumbers(row) as unknown as MonthlyKpis;
    },
    enabled: !!company?.id,
  });
}

// ─── Recent Invoices ──────────────────────────────────────
export interface RecentInvoice {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_at: string;
  status: string;
  invoice_number?: string;
}

export function useRecentInvoices(limit = 5) {
  const { company } = useAuth();
  return useQuery<RecentInvoice[]>({
    queryKey: ["recent_invoices", company?.id, limit],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, total_amount, created_at, status, invoice_number, supplier_id, suppliers(name)")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((inv: Record<string, unknown>) => ({
        id: inv.id as string,
        supplier_name: (inv.suppliers as Record<string, unknown>)?.name as string | null ?? null,
        total_amount: (inv.total_amount as number) || 0,
        created_at: inv.created_at as string,
        status: inv.status as string,
        invoice_number: inv.invoice_number as string | undefined,
      }));
    },
    enabled: !!company?.id,
  });
}
