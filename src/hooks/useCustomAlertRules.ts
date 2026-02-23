import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface AlertRule {
  id: string;
  company_id: string;
  category: string;
  alert_type: string;
  enabled: boolean;
  severity: string;
  threshold_value: number | null;
  threshold_unit: string | null;
  comparison_period: string | null;
  notes: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleInsert {
  category: string;
  alert_type: string;
  enabled?: boolean;
  severity?: string;
  threshold_value?: number | null;
  threshold_unit?: string | null;
  comparison_period?: string | null;
  notes?: string | null;
  config?: Record<string, unknown> | null;
}

export function useCustomAlertRules() {
  const { company } = useAuth();
  const companyId = company?.id;

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("custom_alert_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("category", { ascending: true })
        .order("created_at", { ascending: true });
      if (fetchErr) throw fetchErr;
      setRules((data ?? []) as AlertRule[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading alert rules");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (
    rule: AlertRuleInsert
  ): Promise<{ success: boolean; message?: string }> => {
    if (!companyId) return { success: false, message: "No company" };
    try {
      const { error } = await supabase
        .from("custom_alert_rules")
        .insert({ ...rule, company_id: companyId } as Record<string, unknown>);
      if (error) throw error;
      await fetchRules();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Insert failed",
      };
    }
  };

  const updateRule = async (
    id: string,
    updates: Partial<AlertRuleInsert>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!companyId) return { success: false, message: "No company" };
    try {
      const { error } = await supabase
        .from("custom_alert_rules")
        .update(updates as Record<string, unknown>)
        .eq("id", id)
        .eq("company_id", companyId);
      if (error) throw error;
      await fetchRules();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Update failed",
      };
    }
  };

  const deleteRule = async (
    id: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!companyId) return { success: false, message: "No company" };
    try {
      const { error } = await supabase
        .from("custom_alert_rules")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);
      if (error) throw error;
      setRules((prev) => prev.filter((r) => r.id !== id));
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Delete failed",
      };
    }
  };

  const toggleRule = async (
    id: string,
    enabled: boolean
  ): Promise<{ success: boolean; message?: string }> => {
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );
    const result = await updateRule(id, { enabled });
    if (!result.success) {
      // Revert on failure
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r))
      );
    }
    return result;
  };

  return { rules, loading, error, addRule, updateRule, deleteRule, toggleRule, refresh: fetchRules };
}
