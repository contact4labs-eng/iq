import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

export interface KpiData {
  revenue: number;
  revenuePrev: number;
  revenuePct: number;
  revenueSparkline: number[];
  expenses: number;
  expensesPrev: number;
  expensesPct: number;
  expensesSparkline: number[];
  netProfit: number;
  netProfitPrev: number;
  netProfitPct: number;
  margin: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  netExposure: number;
}

export interface TopSupplier {
  name: string;
  total: number;
  count: number;
}

export interface InvoiceActivity {
  receivedThisMonth: number;
  paidThisMonth: number;
  overdue: number;
  avgDaysToPay: number;
}

export function useBusinessInsights(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [invoiceActivity, setInvoiceActivity] = useState<InvoiceActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

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

        // 30 days ago for sparklines
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

        const results = await Promise.allSettled([
          // 0: Current month revenue
          supabase.from("revenue_entries").select("amount, entry_date")
            .eq("company_id", companyId).gte("entry_date", curMonthStart).lte("entry_date", curMonthEnd),
          // 1: Current month expenses
          supabase.from("expense_entries").select("amount, entry_date")
            .eq("company_id", companyId).gte("entry_date", curMonthStart).lte("entry_date", curMonthEnd),
          // 2: Previous month revenue
          supabase.from("revenue_entries").select("amount")
            .eq("company_id", companyId).gte("entry_date", prevMonthStart).lte("entry_date", prevMonthEnd),
          // 3: Previous month expenses
          supabase.from("expense_entries").select("amount")
            .eq("company_id", companyId).gte("entry_date", prevMonthStart).lte("entry_date", prevMonthEnd),
          // 4: Outstanding receivables (approved invoices)
          supabase.from("invoices").select("total_amount")
            .eq("company_id", companyId).eq("status", "approved"),
          // 5: Outstanding payables (pending scheduled payments)
          supabase.from("scheduled_payments").select("amount")
            .eq("company_id", companyId).eq("status", "pending"),
          // 6: Top suppliers - invoices this month with supplier info
          supabase.from("invoices").select("total_amount, suppliers(name)")
            .eq("company_id", companyId)
            .gte("invoice_date", curMonthStart).lte("invoice_date", curMonthEnd),
          // 7: All invoices this month (for activity stats)
          supabase.from("invoices").select("id, status, invoice_date, due_date, paid_date, total_amount")
            .eq("company_id", companyId)
            .gte("invoice_date", curMonthStart).lte("invoice_date", curMonthEnd),
          // 8: Overdue count
          supabase.from("invoices").select("id")
            .eq("company_id", companyId).eq("status", "approved").lt("due_date", curMonthEnd),
          // 9: 30-day revenue for sparkline
          supabase.from("revenue_entries").select("amount, entry_date")
            .eq("company_id", companyId).gte("entry_date", thirtyDaysAgoStr).lte("entry_date", curMonthEnd),
          // 10: 30-day expenses for sparkline
          supabase.from("expense_entries").select("amount, entry_date")
            .eq("company_id", companyId).gte("entry_date", thirtyDaysAgoStr).lte("entry_date", curMonthEnd),
        ]);

        const get = (i: number) => {
          const r = results[i];
          if (r.status === "fulfilled") return r.value.data ?? [];
          return [];
        };

        // KPI calculations
        const curRevRows = get(0) as any[];
        const curExpRows = get(1) as any[];
        const prevRevRows = get(2) as any[];
        const prevExpRows = get(3) as any[];
        const recvRows = get(4) as any[];
        const payRows = get(5) as any[];

        const curRev = curRevRows.reduce((s: number, r: any) => s + safe(r.amount), 0);
        const curExp = curExpRows.reduce((s: number, r: any) => s + safe(r.amount), 0);
        const prevRev = prevRevRows.reduce((s: number, r: any) => s + safe(r.amount), 0);
        const prevExp = prevExpRows.reduce((s: number, r: any) => s + safe(r.amount), 0);
        const curProfit = curRev - curExp;
        const prevProfit = prevRev - prevExp;
        const outRecv = recvRows.reduce((s: number, r: any) => s + safe(r.total_amount), 0);
        const outPay = payRows.reduce((s: number, r: any) => s + safe(r.amount), 0);

        const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : 0;

        // Build 30-day sparklines (daily buckets)
        const buildSparkline = (rows: any[], field: string = "amount") => {
          const dailyMap = new Map<string, number>();
          for (let d = 29; d >= 0; d--) {
            const date = new Date(now);
            date.setDate(date.getDate() - d);
            dailyMap.set(date.toISOString().slice(0, 10), 0);
          }
          for (const r of rows) {
            const key = (r.entry_date as string).slice(0, 10);
            if (dailyMap.has(key)) {
              dailyMap.set(key, (dailyMap.get(key) ?? 0) + safe(r[field]));
            }
          }
          return Array.from(dailyMap.values());
        };

        const revSparkRows = get(9) as any[];
        const expSparkRows = get(10) as any[];

        setKpi({
          revenue: curRev,
          revenuePrev: prevRev,
          revenuePct: pct(curRev, prevRev),
          revenueSparkline: buildSparkline(revSparkRows),
          expenses: curExp,
          expensesPrev: prevExp,
          expensesPct: pct(curExp, prevExp),
          expensesSparkline: buildSparkline(expSparkRows),
          netProfit: curProfit,
          netProfitPrev: prevProfit,
          netProfitPct: pct(curProfit, prevProfit),
          margin: curRev > 0 ? (curProfit / curRev) * 100 : 0,
          outstandingReceivables: outRecv,
          outstandingPayables: outPay,
          netExposure: outRecv - outPay,
        });

        // Top suppliers
        const supplierRows = get(6) as any[];
        const supplierMap = new Map<string, { total: number; count: number }>();
        for (const r of supplierRows) {
          const name = (r.suppliers as any)?.name ?? "—";
          const entry = supplierMap.get(name) ?? { total: 0, count: 0 };
          entry.total += safe(r.total_amount);
          entry.count += 1;
          supplierMap.set(name, entry);
        }
        const sortedSuppliers = Array.from(supplierMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 7);
        setTopSuppliers(sortedSuppliers);

        // Invoice activity
        const invoiceRows = get(7) as any[];
        const overdueRows = get(8) as any[];
        const paidInvoices = invoiceRows.filter((r: any) => r.status === "paid" || r.paid_date);
        let totalDaysToPay = 0;
        let paidCount = 0;
        for (const inv of paidInvoices) {
          if (inv.invoice_date && inv.paid_date) {
            const issued = new Date(inv.invoice_date);
            const paid = new Date(inv.paid_date);
            const days = Math.max(0, Math.floor((paid.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24)));
            totalDaysToPay += days;
            paidCount++;
          }
        }

        setInvoiceActivity({
          receivedThisMonth: invoiceRows.length,
          paidThisMonth: paidInvoices.length,
          overdue: overdueRows.length,
          avgDaysToPay: paidCount > 0 ? Math.round(totalDaysToPay / paidCount) : 0,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading insights");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId, refreshKey]);

  return { kpi, topSuppliers, invoiceActivity, loading, error };
}
