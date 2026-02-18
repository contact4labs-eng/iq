import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface ExecutiveSummary {
  total_invoices: number;
  total_spend: number;
  avg_invoice: number;
  unique_suppliers: number;
  invoices_this_month: number;
  spend_this_month: number;
}

export interface SupplierPerformance {
  supplier_name: string;
  total_spend: number;
  invoice_count: number;
  avg_invoice: number;
  dependency_pct: number;
  risk_level: string;
}

export interface CostAnalytics {
  by_category: { category: string; total: number }[];
  monthly_trends: { month: string; total: number }[];
}

export interface PriceVolatility {
  product_name: string;
  supplier_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  latest_price: number;
  volatility: number;
  level: string;
}

// Map RPC response field names to our ExecutiveSummary interface
function mapExecutiveSummary(raw: Record<string, unknown>): ExecutiveSummary {
  return {
    total_invoices: (raw.total_invoices as number) ?? 0,
    total_spend: (raw.total_spend as number) ?? (raw.current_quarter_spend as number) ?? 0,
    avg_invoice: (raw.avg_invoice as number) ?? (raw.avg_invoice_amount as number) ?? 0,
    unique_suppliers: (raw.unique_suppliers as number) ?? (raw.total_suppliers as number) ?? 0,
    invoices_this_month: (raw.invoices_this_month as number) ?? 0,
    spend_this_month: (raw.spend_this_month as number) ?? (raw.current_month_spend as number) ?? 0,
  };
}

// Map RPC response field names to our SupplierPerformance interface
function mapSupplierPerformance(raw: Record<string, unknown>): SupplierPerformance {
  return {
    supplier_name: (raw.supplier_name as string) ?? "",
    total_spend: (raw.total_spend as number) ?? 0,
    invoice_count: (raw.invoice_count as number) ?? 0,
    avg_invoice: (raw.avg_invoice as number) ?? (raw.avg_invoice_amount as number) ?? 0,
    dependency_pct: (raw.dependency_pct as number) ?? (raw.dependency_percentage as number) ?? 0,
    risk_level: ((raw.risk_level as string) ?? (raw.dependency_risk as string) ?? "low").toLowerCase(),
  };
}

// Map RPC response field names to our PriceVolatility interface
function mapPriceVolatility(raw: Record<string, unknown>): PriceVolatility {
  return {
    product_name: (raw.product_name as string) ?? "",
    supplier_name: (raw.supplier_name as string) ?? "",
    avg_price: (raw.avg_price as number) ?? 0,
    min_price: (raw.min_price as number) ?? 0,
    max_price: (raw.max_price as number) ?? 0,
    latest_price: (raw.latest_price as number) ?? raw.avg_price as number ?? 0,
    volatility: (raw.volatility as number) ?? (raw.volatility_score as number) ?? 0,
    level: (raw.level as string) ?? (raw.volatility_level as string)?.toLowerCase() ?? "low",
  };
}

export function useInvoiceAnalytics() {
  const { company } = useAuth();
  const companyId = company?.id;

  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [costAnalytics, setCostAnalytics] = useState<CostAnalytics | null>(null);
  const [priceVolatility, setPriceVolatility] = useState<PriceVolatility[]>([]);
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
        const [execRes, suppRes, costRes, volRes] = await Promise.all([
          supabase.rpc("get_executive_summary", { p_company_id: companyId }),
          supabase.rpc("get_supplier_performance", { p_company_id: companyId }),
          supabase.rpc("get_cost_analytics", { p_company_id: companyId }),
          supabase.rpc("get_price_volatility", { p_company_id: companyId }),
        ]);

        if (execRes.error) throw execRes.error;
        if (suppRes.error) throw suppRes.error;
        if (costRes.error) throw costRes.error;
        if (volRes.error) throw volRes.error;

        // Executive summary may return a single row or array with one row
        const execRaw = Array.isArray(execRes.data) ? execRes.data[0] : execRes.data;
        const costData = Array.isArray(costRes.data) ? costRes.data[0] : costRes.data;
        const costRaw = (costData ?? {}) as Record<string, unknown>;
        
        // Merge cost analytics fields into executive summary for total_spend and avg_invoice
        const mergedExec = { ...(execRaw as Record<string, unknown>) };
        if (!mergedExec.total_spend && costRaw.total_spend) mergedExec.total_spend = costRaw.total_spend;
        if (!mergedExec.avg_invoice && !mergedExec.avg_invoice_amount && costRaw.avg_invoice_amount) mergedExec.avg_invoice_amount = costRaw.avg_invoice_amount;
        
        setExecutive(mapExecutiveSummary(mergedExec));
        setSuppliers((suppRes.data ?? []).map((s: Record<string, unknown>) => mapSupplierPerformance(s)));
        setCostAnalytics(costData as CostAnalytics);
        setPriceVolatility((volRes.data ?? []).map((r: Record<string, unknown>) => mapPriceVolatility(r)));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Σφάλμα φόρτωσης αναλύσεων";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [companyId]);

  return { executive, suppliers, costAnalytics, priceVolatility, loading, error };
}
