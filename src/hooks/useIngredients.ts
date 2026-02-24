import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Ingredient {
  id: string;
  company_id: string;
  name: string;
  category: string;
  unit: string;        // kg | g | lt | ml
  price_per_unit: number;
  supplier_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * CRUD hook for the ingredients table.
 * @param refreshKey - increment to force re-fetch
 */
export function useIngredients(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [data, setData] = useState<Ingredient[]>([]);
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
        .from("ingredients")
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (err) throw err;
      setData((rows ?? []) as Ingredient[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading ingredients");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  /** Get unique categories from existing ingredients */
  const categories = [...new Set(data.map((i) => i.category).filter(Boolean))].sort();

  return { data, loading, error, refetch: fetchData, categories };
}
