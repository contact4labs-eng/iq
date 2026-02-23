import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

export interface MonthlyPL {
  revenue: number;
  expenses: number;
  net_profit: number;
  prev_revenue: number;
  prev_expenses: number;
  prev_net_profit: number;
  revenue_change_pct: number;
  expenses_change_pct: number;
  profit_change_pct: number;
}

export interface ExpenseCategory {
  category: string;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
}

export function useFinanceExtras(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [monthlyPL, setMonthlyPL] = useState<MonthlyPL | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseCategory[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const curMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const curMonthEnd = now.toISOString().slice(0, 10);

        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

        // 6 months ago for trends
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

        const [curRevRes, curExpRes, prevRevRes, prevExpRes, trendRevRes, trendExpRes] = await Promise.all([
          // Current month revenue
          supabase
            .from("revenue_entries")
            .select("amount")
            .eq("company_id", companyId)
            .gte("entry_date", curMonthStart)
            .lte("entry_date", curMonthEnd),
          // Current month expenses
          supabase
            .from("expense_entries")
            .select("amount, description")
            .eq("company_id", companyId)
            .gte("entry_date", curMonthStart)
            .lte("entry_date", curMonthEnd),
          // Previous month revenue
          supabase
            .from("revenue_entries")
            .select("amount")
            .eq("company_id", companyId)
            .gte("entry_date", prevMonthStart)
            .lte("entry_date", prevMonthEnd),
          // Previous month expenses
          supabase
            .from("expense_entries")
            .select("amount")
            .eq("company_id", companyId)
            .gte("entry_date", prevMonthStart)
            .lte("entry_date", prevMonthEnd),
          // 6-month revenue trends
          supabase
            .from("revenue_entries")
            .select("amount, entry_date")
            .eq("company_id", companyId)
            .gte("entry_date", sixMonthsAgoStr)
            .lte("entry_date", curMonthEnd),
          // 6-month expense trends
          supabase
            .from("expense_entries")
            .select("amount, entry_date")
            .eq("company_id", companyId)
            .gte("entry_date", sixMonthsAgoStr)
            .lte("entry_date", curMonthEnd),
        ]);

        // Monthly P&L
        const curRev = (curRevRes.data ?? []).reduce((s, r: any) => s + safe(r.amount), 0);
        const curExp = (curExpRes.data ?? []).reduce((s, r: any) => s + safe(r.amount), 0);
        const prevRev = (prevRevRes.data ?? []).reduce((s, r: any) => s + safe(r.amount), 0);
        const prevExp = (prevExpRes.data ?? []).reduce((s, r: any) => s + safe(r.amount), 0);
        const curProfit = curRev - curExp;
        const prevProfit = prevRev - prevExp;

        const pctChange = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : 0;

        setMonthlyPL({
          revenue: curRev,
          expenses: curExp,
          net_profit: curProfit,
          prev_revenue: prevRev,
          prev_expenses: prevExp,
          prev_net_profit: prevProfit,
          revenue_change_pct: pctChange(curRev, prevRev),
          expenses_change_pct: pctChange(curExp, prevExp),
          profit_change_pct: pctChange(curProfit, prevProfit),
        });

        // Expense breakdown by description
        const expRows = (curExpRes.data ?? []) as any[];
        const catMap = new Map<string, number>();
        for (const r of expRows) {
          const cat = r.description || "Άλλο";
          catMap.set(cat, (catMap.get(cat) ?? 0) + safe(r.amount));
        }
        const totalExp = curExp > 0 ? curExp : 1;
        const categories = Array.from(catMap.entries())
          .map(([category, total]) => ({ category, total, percentage: (total / totalExp) * 100 }))
          .sort((a, b) => b.total - a.total);
        setExpenseBreakdown(categories);

        // 6-month trends
        const monthMap = new Map<string, { revenue: number; expenses: number }>();
        // Initialize 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap.set(key, { revenue: 0, expenses: 0 });
        }
        for (const r of (trendRevRes.data ?? []) as any[]) {
          const key = (r.entry_date as string).slice(0, 7);
          const entry = monthMap.get(key);
          if (entry) entry.revenue += safe(r.amount);
        }
        for (const r of (trendExpRes.data ?? []) as any[]) {
          const key = (r.entry_date as string).slice(0, 7);
          const entry = monthMap.get(key);
          if (entry) entry.expenses += safe(r.amount);
        }

        const monthNames = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαϊ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
        const trends: MonthlyTrend[] = [];
        for (const [key, val] of monthMap) {
          const monthIdx = parseInt(key.split("-")[1], 10) - 1;
          trends.push({ month: monthNames[monthIdx], revenue: val.revenue, expenses: val.expenses });
        }
        setMonthlyTrends(trends);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Σφάλμα φόρτωσης δεδομένων");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId, refreshKey]);

  return { monthlyPL, expenseBreakdown, monthlyTrends, loading, error };
}
