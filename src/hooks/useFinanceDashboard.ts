import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

export interface CashPositionData {
  cash_on_hand: number;
  bank_balance: number;
  total_cash: number;
  prev_total_cash: number;
  change_pct: number;
}

export interface ReceivablesData {
  total: number;
  count: number;
}

export interface PayablesData {
  total: number;
  count: number;
}

export interface WeeklyCashFlow {
  week: string;
  inflows: number;
  outflows: number;
}

export interface OverdueInvoice {
  id: string;
  supplier_name: string;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  days_overdue: number;
}

export interface UpcomingPayment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  days_until: number;
  status: string;
}

export function useFinanceDashboard(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [cashPosition, setCashPosition] = useState<CashPositionData | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesData | null>(null);
  const [payables, setPayables] = useState<PayablesData | null>(null);
  const [weeklyCashFlow, setWeeklyCashFlow] = useState<WeeklyCashFlow[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Cash Position â latest record
        const cashPromise = supabase
          .from("cash_positions")
          .select("cash_on_hand, bank_balance, total_cash")
          .eq("company_id", companyId)
          .order("recorded_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 1b. Previous month cash position
        const prevMonthDate = new Date(today);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonthStr = prevMonthDate.toISOString().slice(0, 10);
        const prevCashPromise = supabase
          .from("cash_positions")
          .select("total_cash")
          .eq("company_id", companyId)
          .lte("recorded_date", prevMonthStr)
          .order("recorded_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 2. Receivables â approved invoices (all approved are considered receivable)
        const receivablesPromise = supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("status", "approved");

        // 3. Payables â scheduled payments pending
        const payablesPromise = supabase
          .from("scheduled_payments")
          .select("amount")
          .eq("company_id", companyId)
          .eq("status", "pending");

        // 4. Revenue entries last 30 days (for weekly inflows)
        const revenuePromise = supabase
          .from("revenue_entries")
          .select("amount, entry_date")
          .eq("company_id", companyId)
          .gte("entry_date", thirtyDaysAgoStr)
          .lte("entry_date", todayStr);

        // 5. Expense entries last 30 days (for weekly outflows)
        const expensePromise = supabase
          .from("expense_entries")
          .select("amount, entry_date")
          .eq("company_id", companyId)
          .gte("entry_date", thirtyDaysAgoStr)
          .lte("entry_date", todayStr);

        // 6. Overdue invoices â approved invoices past due_date
        const overduePromise = supabase
          .from("invoices")
          .select("id, invoice_number, total_amount, due_date, suppliers(name)")
          .eq("company_id", companyId)
          .eq("status", "approved")
          .lt("due_date", todayStr)
          .order("due_date", { ascending: true })
          .limit(20);

        // 7. Upcoming scheduled payments
        const upcomingPromise = supabase
          .from("scheduled_payments")
          .select("id, description, amount, due_date, status")
          .eq("company_id", companyId)
          .eq("status", "pending")
          .gte("due_date", todayStr)
          .order("due_date", { ascending: true })
          .limit(20);

        const results = await Promise.allSettled([
          cashPromise, prevCashPromise, receivablesPromise, payablesPromise, revenuePromise, expensePromise, overduePromise, upcomingPromise,
        ]);

        // Helper to safely extract fulfilled results
        const getResult = (index: number) => {
          const r = results[index];
          if (r.status === "fulfilled") return r.value;
          console.error(`Finance query ${index} failed:`, r.reason);
          return { data: null, error: r.reason };
        };

        const cashRes = getResult(0);
        const prevCashRes = getResult(1);
        const recvRes = getResult(2);
        const payRes = getResult(3);
        const revRes = getResult(4);
        const expRes = getResult(5);
        const overdueRes = getResult(6);
        const upcomingRes = getResult(7);

        // Check for individual query errors and warn
        const queryErrors: string[] = [];
        results.forEach((r, i) => {
          if (r.status === "rejected") queryErrors.push(`Query ${i}`);
          else if (r.value?.error) queryErrors.push(`Query ${i}: ${r.value.error.message}`);
        });
        if (queryErrors.length > 0) {
          console.warn("Some finance queries had errors:", queryErrors);
        }

        // Process cash position
        const prevTotal = safe((prevCashRes.data as any)?.total_cash);
        if (cashRes.data) {
          const d = cashRes.data as any;
          const currentTotal = safe(d.total_cash);
          const changePct = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
          setCashPosition({
            cash_on_hand: safe(d.cash_on_hand),
            bank_balance: safe(d.bank_balance),
            total_cash: currentTotal,
            prev_total_cash: prevTotal,
            change_pct: changePct,
          });
        } else {
          setCashPosition({ cash_on_hand: 0, bank_balance: 0, total_cash: 0, prev_total_cash: 0, change_pct: 0 });
        }

        // Process receivables
        const recvRows = (recvRes.data ?? []) as any[];
        setReceivables({
          total: recvRows.reduce((sum: number, r: any) => sum + safe(r.total_amount), 0),
          count: recvRows.length,
        });

        // Process payables
        const payRows = (payRes.data ?? []) as any[];
        setPayables({
          total: payRows.reduce((sum: number, r: any) => sum + safe(r.amount), 0),
          count: payRows.length,
        });

        // Process 30-day cash flow into 4 weeks
        const revRows = (revRes.data ?? []) as any[];
        const expRows = (expRes.data ?? []) as any[];

        const weeks: WeeklyCashFlow[] = [
          { week: "ÎÎ²Î´. 1", inflows: 0, outflows: 0 },
          { week: "ÎÎ²Î´. 2", inflows: 0, outflows: 0 },
          { week: "ÎÎ²Î´. 3", inflows: 0, outflows: 0 },
          { week: "ÎÎ²Î´. 4", inflows: 0, outflows: 0 },
        ];

        const getWeekIndex = (dateStr: string) => {
          const d = new Date(dateStr);
          const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 7) return 3; // ÎÎ²Î´. 4 (most recent)
          if (diffDays < 14) return 2;
          if (diffDays < 21) return 1;
          return 0; // ÎÎ²Î´. 1 (oldest)
        };

        for (const r of revRows) {
          const idx = getWeekIndex(r.entry_date);
          weeks[idx].inflows += safe(r.amount);
        }
        for (const e of expRows) {
          const idx = getWeekIndex(e.entry_date);
          weeks[idx].outflows += safe(e.amount);
        }

        setWeeklyCashFlow(weeks);

        // Process overdue invoices
        const overdueRows = (overdueRes.data ?? []) as any[];
        setOverdueInvoices(
          overdueRows.map((r) => {
            const due = new Date(r.due_date);
            const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
            return {
              id: r.id,
              supplier_name: (r.suppliers as any)?.name ?? "â",
              invoice_number: r.invoice_number ?? "â",
              total_amount: safe(r.total_amount),
              due_date: r.due_date,
              days_overdue: daysOverdue,
            };
          })
        );

        // Process upcoming payments
        const upcomingRows = (upcomingRes.data ?? []) as any[];
        setUpcomingPayments(
          upcomingRows.map((r) => {
            const due = new Date(r.due_date);
            const daysUntil = Math.max(0, Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            return {
              id: r.id,
              description: r.description ?? "â",
              amount: safe(r.amount),
              due_date: r.due_date,
              days_until: daysUntil,
              status: r.status ?? "pending",
            };
          })
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Î£ÏÎ¬Î»Î¼Î± ÏÏÏÏÏÏÎ·Ï Î´ÎµÎ´Î¿Î¼Î­Î½ÏÎ½");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId, refreshKey]);

  return { cashPosition, receivables, payables, weeklyCashFlow, overdueInvoices, upcomingPayments, loading, error };
}
