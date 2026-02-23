import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface FixedCostEntry {
  id: string;
  company_id: string;
  category: string;
  amount: number;
  month: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for fetching and managing fixed costs.
 * @param selectedMonth - Date representing the month to filter (uses year + month only)
 * @param refreshKey - Increment to trigger re-fetch
 */
export function useFixedCosts(selectedMonth: Date, refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [data, setData] = useState<FixedCostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: rows, error: err } = await supabase
        .from("fixed_costs")
        .select("*")
        .eq("company_id", companyId)
        .eq("month", monthStr)
        .order("category", { ascending: true });

      if (err) throw err;
      setData((rows ?? []) as FixedCostEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading fixed costs");
    } finally {
      setLoading(false);
    }
  }, [companyId, monthStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  return { data, loading, error, refetch: fetchData };
}
