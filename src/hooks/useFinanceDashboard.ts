import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: any): number => (v == null || isNaN(v)) ? 0 : Number(v);

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
    if (!companyId) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Cash Position — latest record
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

        // 2. Receivables — approved invoices not yet paid
        const receivablesPromise = supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("status", "approved")
          .neq("payment_status", "paid");

        // 3. Payables — scheduled payments pending
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

        // 6. Overdue invoices
        const overduePromise = supabase
          .from("invoices")
          .select("id, supplier_name, invoice_number, total_amount, due_date")
          .eq("company_id", companyId)
          .eq("payment_status", "overdue")
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

        const [cashRes, prevCashRes, recvRes, payRes, revRes, expRes, overdueRes, upcomingRes] = await Promise.all([
          cashPromise, prevCashPromise, receivablesPromise, payablesPromise, revenuePromise, expensePromise, overduePromise, upcomingPromise,
        ]);

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
          total: recvRows.reduce((sum, r) => sum + safe(r.total_amount), 0),
          count: recvRows.length,
        });

        // Process payables
        const payRows = (payRes.data ?? []) as any[];
        setPayables({
          total: payRows.reduce((sum, r) => sum + safe(r.amount), 0),
          count: payRows.length,
        });

        // Process 30-day cash flow into 4 weeks
        const revRows = (revRes.data ?? []) as any[];
        const expRows = (expRes.data ?? []) as any[];

        const weeks: WeeklyCashFlow[] = [
          { week: "Εβδ. 1", inflows: 0, outflows: 0 },
          { week: "Εβδ. 2", inflows: 0, outflows: 0 },
          { week: "Εβδ. 3", inflows: 0, outflows: 0 },
          { week: "Εβδ. 4", inflows: 0, outflows: 0 },
        ];

        const getWeekIndex = (dateStr: string) => {
          const d = new Date(dateStr);
          const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 7) return 3; // Εβδ. 4 (most recent)
          if (diffDays < 14) return 2;
          if (diffDays < 21) return 1;
          return 0; // Εβδ. 1 (oldest)
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
              supplier_name: r.supplier_name ?? "—",
              invoice_number: r.invoice_number ?? "—",
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
              description: r.description ?? "—",
              amount: safe(r.amount),
              due_date: r.due_date,
              days_until: daysUntil,
              status: r.status ?? "pending",
            };
          })
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Σφάλμα φόρτωσης δεδομένων");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId, refreshKey]);

  return { cashPosition, receivables, payables, weeklyCashFlow, overdueInvoices, upcomingPayments, loading, error };
}
