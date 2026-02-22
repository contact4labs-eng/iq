import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

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
        const [mRes, dRes, wRes, cfRes, ebRes, ppRes] = await Promise.allSettled([
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

        const pickSafe = (d: unknown) => {
          const raw = Array.isArray(d) ? d[0] : d;
          if (!raw || typeof raw !== "object") return null;
          const obj = raw as Record<string, unknown>;
          const safed: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            safed[k] = typeof v === "number" || (typeof v === "string" && !isNaN(Number(v))) ? safe(v) : v;
          }
          return safed;
        };

        if (mRes.status === "fulfilled" && !mRes.value.error) {
          setMonthly(pickSafe(mRes.value.data) as unknown as MonthlyKpis);
        } else {
          console.error("Monthly KPIs error:", mRes.status === "fulfilled" ? mRes.value.error : mRes.reason);
        }
        if (dRes.status === "fulfilled" && !dRes.value.error) {
          setDaily(pickSafe(dRes.value.data) as unknown as DailyKpis);
        } else {
          console.error("Daily KPIs error:", dRes.status === "fulfilled" ? dRes.value.error : dRes.reason);
        }
        if (wRes.status === "fulfilled" && !wRes.value.error) {
          setWeekly(pickSafe(wRes.value.data) as unknown as WeeklyKpis);
        } else {
          console.error("Weekly KPIs error:", wRes.status === "fulfilled" ? wRes.value.error : wRes.reason);
        }
        if (cfRes.status === "fulfilled" && !cfRes.value.error) {
          setCashFlow((cfRes.value.data ?? []) as CashFlowPoint[]);
        } else {
          console.error("Cash flow error:", cfRes.status === "fulfilled" ? cfRes.value.error : cfRes.reason);
        }
        if (ebRes.status === "fulfilled" && !ebRes.value.error) {
          setExpenseBreakdown((ebRes.value.data ?? []) as ExpenseCategory[]);
        } else {
          console.error("Expense breakdown error:", ebRes.status === "fulfilled" ? ebRes.value.error : ebRes.reason);
        }
        if (ppRes.status === "fulfilled" && !ppRes.value.error) {
          setProfitPressure(pickSafe(ppRes.value.data) as unknown as ProfitPressure);
        } else {
          console.error("Profit pressure error:", ppRes.status === "fulfilled" ? ppRes.value.error : ppRes.reason);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Î£ÏÎ¬Î»Î¼Î± ÏÏÏÏÏÏÎ·Ï Î¿Î¹ÎºÎ¿Î½Î¿Î¼Î¹ÎºÏÎ½ Î´ÎµÎ´Î¿Î¼Î­Î½ÏÎ½");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId, refreshKey]);

  return { monthly, daily, weekly, cashFlow, expenseBreakdown, profitPressure, loading, error };
}
