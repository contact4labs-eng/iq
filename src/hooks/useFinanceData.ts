import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyKpis {
  net_profit: number;
  margin_pct: number;
  revenue_total: number;
  expenses_total: number;
  revenue_growth_rate: number;
  expense_growth_rate: number;
}

export interface DailyKpis {
  cash_position: number;
  pending_outgoing: number;
  mtd_profit: number;
  overdue_amount: number;
  today_revenue?: number;
  today_expenses?: number;
  today_profit?: number;
}

export interface WeeklyKpis {
  this_week_revenue: number;
  this_week_expenses: number;
  this_week_profit: number;
  last_week_revenue: number;
  last_week_expenses: number;
  last_week_profit: number;
  revenue_change_pct: number;
  expenses_change_pct: number;
  profit_change_pct: number;
}

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

export function useFinanceData(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [monthly, setMonthly] = useState<MonthlyKpis | null>(null);
  const [daily, setDaily] = useState<DailyKpis | null>(null);
  const [weekly, setWeekly] = useState<WeeklyKpis | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseCategory[]>([]);
  const [profitPressure, setProfitPressure] = useState<ProfitPressure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const now = new Date();
    const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const toDate = now.toISOString().slice(0, 10);

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [mRes, dRes, wRes, cfRes, ebRes, ppRes] = await Promise.all([
          supabase.rpc("get_monthly_kpis", { p_company_id: companyId }),
          supabase.rpc("get_daily_kpis", { p_company_id: companyId }),
          supabase.rpc("get_weekly_kpis", { p_company_id: companyId }),
          supabase.rpc("get_cash_flow", { p_company_id: companyId }),
          supabase.rpc("get_expense_category_breakdown", {
            p_company_id: companyId,
            p_from_date: fromDate,
            p_to_date: toDate,
          }),
          supabase.rpc("get_profit_pressure", { p_company_id: companyId }),
        ]);

        for (const r of [mRes, dRes, wRes, cfRes, ebRes, ppRes]) {
          if (r.error) throw r.error;
        }

        const pick = (d: unknown) => (Array.isArray(d) ? d[0] : d);
        setMonthly(pick(mRes.data) as MonthlyKpis);
        setDaily(pick(dRes.data) as DailyKpis);
        setWeekly(pick(wRes.data) as WeeklyKpis);
        setCashFlow((cfRes.data ?? []) as CashFlowPoint[]);
        setExpenseBreakdown((ebRes.data ?? []) as ExpenseCategory[]);
        setProfitPressure(pick(ppRes.data) as ProfitPressure);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Σφάλμα φόρτωσης οικονομικών δεδομένων");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId, refreshKey]);

  return { monthly, daily, weekly, cashFlow, expenseBreakdown, profitPressure, loading, error };
}
