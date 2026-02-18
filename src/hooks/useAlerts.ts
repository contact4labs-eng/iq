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
  status: string;
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
      const { data, error: listErr } = await supabase
        .from("alerts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (listErr) throw listErr;
      const rawAlerts = (data ?? []) as Array<Record<string, unknown>>;
      const mapped = rawAlerts.map((a) => ({
        ...a,
        is_resolved: a.status === "resolved",
      })) as AlertItem[];
      setAlerts(mapped);

      // Compute summary client-side
      const unresolvedAlerts = mapped.filter((a) => !a.is_resolved);
      setSummary({
        critical: unresolvedAlerts.filter((a) => a.severity === "critical").length,
        high: unresolvedAlerts.filter((a) => a.severity === "high").length,
        medium: unresolvedAlerts.filter((a) => a.severity === "medium").length,
        low: unresolvedAlerts.filter((a) => a.severity === "low").length,
      });
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
      .update({ status: "resolved", resolved_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", alertId);
    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "resolved", is_resolved: true, resolved_at: new Date().toISOString() } : a))
      );
    }
    return error;
  };

  return { summary, alerts, loading, error, resolveAlert, refresh: fetchAlerts };
}
