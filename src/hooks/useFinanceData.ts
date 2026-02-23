import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDailyKpis,
  useWeeklyKpis,
  useMonthlyKpis,
} from "@/hooks/queries/useSupabaseQuery";

// Re-export shared types
export type {
  DailyKpis,
  WeeklyKpis,
  MonthlyKpis,
} from "@/hooks/queries/useSupabaseQuery";

export interface CashFlowPoint {
  month: string;
  revenue: number;
  expenses: number;
  net_flow: number;
}

export interface ExpenseCategory {
  category: string;
  total: number;
  percentage: number;
}

export interface ProfitPressure {
  pressure_level: string;
  current_margin: number;
  previous_margin: number;
  top_sources: { source: string; impact: number }[];
}

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

function pickSafe(d: unknown): Record<string, unknown> | null {
  const raw = Array.isArray(d) ? d[0] : d;
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const safed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    safed[k] = typeof v === "number" || (typeof v === "string" && !isNaN(Number(v))) ? safe(v) : v;
  }
  return safed;
}

/**
 * Finance data hook — shared daily/weekly/monthly KPIs come from
 * @tanstack/react-query (deduplicated with Dashboard), while
 * finance-specific RPCs are fetched here.
 */
export function useFinanceData(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const lastRefreshKeyRef = useRef(refreshKey);

  // Shared cached queries (same cache key as Dashboard)
  const monthlyQuery = useMonthlyKpis();
  const dailyQuery = useDailyKpis();
  const weeklyQuery = useWeeklyKpis();

  // Finance-specific: cash flow
  const cashFlowQuery = useQuery<CashFlowPoint[]>({
    queryKey: ["rpc", "get_cash_flow", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_cash_flow", { p_company_id: companyId });
      if (error) throw error;
      return (data ?? []) as CashFlowPoint[];
    },
    enabled: !!companyId,
  });

  // Finance-specific: expense breakdown
  const expenseQuery = useQuery<ExpenseCategory[]>({
    queryKey: ["rpc", "get_expense_category_breakdown", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const now = new Date();
      const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const toDate = now.toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc("get_expense_category_breakdown", {
        p_company_id: companyId,
        p_from_date: fromDate,
        p_to_date: toDate,
      });
      if (error) throw error;
      return (data ?? []) as ExpenseCategory[];
    },
    enabled: !!companyId,
  });

  // Finance-specific: profit pressure
  const pressureQuery = useQuery<ProfitPressure | null>({
    queryKey: ["rpc", "get_profit_pressure", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc("get_profit_pressure", { p_company_id: companyId });
      if (error) throw error;
      return pickSafe(data) as unknown as ProfitPressure;
    },
    enabled: !!companyId,
  });

  const refresh = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: ["rpc"] });
  }, [queryClient, companyId]);

  // Support legacy refreshKey
  useEffect(() => {
    if (refreshKey > lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      refresh();
    }
  }, [refreshKey, refresh]);

  const loading =
    monthlyQuery.isLoading || dailyQuery.isLoading || weeklyQuery.isLoading ||
    cashFlowQuery.isLoading || expenseQuery.isLoading || pressureQuery.isLoading;

  const error =
    monthlyQuery.error?.message || dailyQuery.error?.message ||
    weeklyQuery.error?.message || cashFlowQuery.error?.message ||
    expenseQuery.error?.message || pressureQuery.error?.message || null;

  return {
    monthly: monthlyQuery.data ?? null,
    daily: dailyQuery.data ?? null,
    weekly: weeklyQuery.data ?? null,
    cashFlow: cashFlowQuery.data ?? [],
    expenseBreakdown: expenseQuery.data ?? [],
    profitPressure: pressureQuery.data ?? null,
    loading,
    error,
  };
}
