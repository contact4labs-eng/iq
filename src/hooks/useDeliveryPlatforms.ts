import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface DeliveryPlatform {
  id: string;
  company_id: string;
  name: string;
  commission_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * CRUD hook for delivery platforms (Wolt, efood, etc.) and their commission rates.
 */
export function useDeliveryPlatforms(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [data, setData] = useState<DeliveryPlatform[]>([]);
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
        .from("delivery_platforms")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (err) throw err;
      setData((rows ?? []) as DeliveryPlatform[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading delivery platforms"
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const addPlatform = useCallback(
    async (name: string, commissionPercent: number) => {
      if (!companyId) throw new Error("No company found");
      const { error } = await supabase.from("delivery_platforms").insert({
        company_id: companyId,
        name: name.trim(),
        commission_percent: commissionPercent,
      });
      if (error) throw error;
      await fetchData();
    },
    [companyId, fetchData]
  );

  const updatePlatform = useCallback(
    async (
      id: string,
      updates: { name?: string; commission_percent?: number }
    ) => {
      const { error } = await supabase
        .from("delivery_platforms")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData]
  );

  const deletePlatform = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("delivery_platforms")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    addPlatform,
    updatePlatform,
    deletePlatform,
  };
}
