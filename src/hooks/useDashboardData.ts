import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

interface DailyKpis {
  cash_position: number;
  pending_outgoing: number;
  mtd_profit: number;
  overdue_amount: number;
  cash_position_trend?: number;
  pending_outgoing_trend?: number;
  mtd_profit_trend?: number;
  overdue_trend?: number;
}

interface WeeklyKpis {
  revenue: number;
  expenses: number;
  profit: number;
  prev_revenue?: number;
  prev_expenses?: number;
  prev_profit?: number;
}

interface RecentInvoice {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_at: string;
  status: string;
  invoice_number?: string;
}

export function useDashboardData() {
  const { company } = useAuth();
  const [dailyKpis, setDailyKpis] = useState<DailyKpis | null>(null);
  const [weeklyKpis, setWeeklyKpis] = useState<WeeklyKpis | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const [dailyRes, weeklyRes, invoicesRes] = await Promise.allSettled([
          supabase.rpc("get_daily_kpis", { p_company_id: company.id }),
          supabase.rpc("get_weekly_kpis", { p_company_id: company.id }),
          supabase
            .from("invoices")
            .select("id, total_amount, created_at, status, invoice_number, supplier_id, suppliers(name)")
            .eq("company_id", company.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (dailyRes.status === "fulfilled" && !dailyRes.value.error) {
          const d = dailyRes.value.data;
          // Handle both single object and array response
          const kpiData = Array.isArray(d) ? d[0] : d;
          if (kpiData) {
            const kd = kpiData as Record<string, unknown>;
            setDailyKpis({
              cash_position: safe(kd.cash_position),
              pending_outgoing: safe(kd.pending_outgoing),
              mtd_profit: safe(kd.mtd_profit),
              overdue_amount: safe(kd.overdue_amount),
              cash_position_trend: kd.cash_position_trend != null ? safe(kd.cash_position_trend) : undefined,
              pending_outgoing_trend: kd.pending_outgoing_trend != null ? safe(kd.pending_outgoing_trend) : undefined,
              mtd_profit_trend: kd.mtd_profit_trend != null ? safe(kd.mtd_profit_trend) : undefined,
              overdue_trend: kd.overdue_trend != null ? safe(kd.overdue_trend) : undefined,
            });
          }
        } else {
          console.error("Daily KPIs error:", dailyRes.status === "fulfilled" ? dailyRes.value.error : dailyRes.reason);
        }

        if (weeklyRes.status === "fulfilled" && !weeklyRes.value.error) {
          const w = weeklyRes.value.data;
          const weeklyData = Array.isArray(w) ? w[0] : w;
          if (weeklyData) {
            const wd = weeklyData as Record<string, unknown>;
            setWeeklyKpis({
              revenue: safe(wd.revenue),
              expenses: safe(wd.expenses),
              profit: safe(wd.profit),
              prev_revenue: wd.prev_revenue != null ? safe(wd.prev_revenue) : undefined,
              prev_expenses: wd.prev_expenses != null ? safe(wd.prev_expenses) : undefined,
              prev_profit: wd.prev_profit != null ? safe(wd.prev_profit) : undefined,
            });
          }
        } else {
          console.error("Weekly KPIs error:", weeklyRes.status === "fulfilled" ? weeklyRes.value.error : weeklyRes.reason);
        }

        if (invoicesRes.status === "fulfilled" && !invoicesRes.value.error) {
          const mapped = (invoicesRes.value.data || []).map((inv: Record<string, unknown>) => ({
            id: inv.id as string,
            supplier_name: (inv.suppliers as Record<string, unknown>)?.name as string | null ?? null,
            total_amount: (inv.total_amount as number) || 0,
            created_at: inv.created_at as string,
            status: inv.status as string,
            invoice_number: inv.invoice_number as string | undefined,
          }));
          setRecentInvoices(mapped);
        } else {
          console.error("Invoices error:", invoicesRes.status === "fulfilled" ? invoicesRes.value.error : invoicesRes.reason);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Σφάλμα κατά τη φόρτωση δεδομένων. Παρακαλώ δοκιμάστε ξανά.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [company?.id]);

  return { dailyKpis, weeklyKpis, recentInvoices, loading, error };
}
