import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface MarginThreshold {
  id: string;
  company_id: string;
  category: string;
  green_min: number;  // margin >= green_min → green
  yellow_min: number; // margin >= yellow_min → yellow, else red
  created_at: string;
  updated_at: string;
}

const DEFAULT_GREEN = 65;
const DEFAULT_YELLOW = 45;

export function useMarginThresholds(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [data, setData] = useState<MarginThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .from("margin_thresholds")
        .select("*")
        .eq("company_id", companyId)
        .order("category", { ascending: true });

      if (err) throw err;
      setData((rows ?? []) as MarginThreshold[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading thresholds");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  /**
   * Get margin color for a category and margin %.
   * Falls back to default thresholds if category has no custom ones.
   */
  const getMarginColor = useCallback(
    (category: string, marginPercent: number): "green" | "yellow" | "red" => {
      const threshold = data.find((t) => t.category === category);
      const greenMin = threshold?.green_min ?? DEFAULT_GREEN;
      const yellowMin = threshold?.yellow_min ?? DEFAULT_YELLOW;

      if (marginPercent >= greenMin) return "green";
      if (marginPercent >= yellowMin) return "yellow";
      return "red";
    },
    [data]
  );

  return { data, loading, error, refetch: fetchData, getMarginColor };
}
