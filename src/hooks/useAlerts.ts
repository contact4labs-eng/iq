import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface AlertSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AlertItem {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export function useAlerts() {
  const { company } = useAuth();
  const companyId = company?.id;

  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [sumRes, listRes] = await Promise.all([
        supabase.rpc("get_alerts_summary", { p_company_id: companyId }),
        supabase
          .from("alerts")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
      ]);
      if (sumRes.error) throw sumRes.error;
      if (listRes.error) throw listRes.error;
      const s = Array.isArray(sumRes.data) ? sumRes.data[0] : sumRes.data;
      setSummary(s as AlertSummary);
      setAlerts((listRes.data ?? []) as AlertItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Σφάλμα φόρτωσης ειδοποιήσεων");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a))
      );
    }
    return error;
  };

  return { summary, alerts, loading, error, resolveAlert, refresh: fetchAlerts };
}
