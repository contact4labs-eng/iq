import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDailyKpis,
  useWeeklyKpis,
  useRecentInvoices,
} from "@/hooks/queries/useSupabaseQuery";
import { useAuth } from "@/contexts/AuthContext";

// Re-export types for backward compatibility
export type { DailyKpis, WeeklyKpis, RecentInvoice } from "@/hooks/queries/useSupabaseQuery";

/**
 * Dashboard data hook — now backed by @tanstack/react-query.
 *
 * Benefits over the old useState/useEffect pattern:
 *  - Automatic deduplication: if Finance page already fetched get_daily_kpis,
 *    navigating here reuses the cached result.
 *  - Background refetch when stale.
 *  - The refreshKey param is still supported — it triggers cache invalidation.
 */
export function useDashboardData(refreshKey: number = 0) {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const lastRefreshKeyRef = useRef(refreshKey);

  const dailyQuery = useDailyKpis();
  const weeklyQuery = useWeeklyKpis();
  const invoicesQuery = useRecentInvoices(5);

  const refresh = useCallback(() => {
    if (!company?.id) return;
    queryClient.invalidateQueries({ queryKey: ["rpc", "get_daily_kpis", company.id] });
    queryClient.invalidateQueries({ queryKey: ["rpc", "get_weekly_kpis", company.id] });
    queryClient.invalidateQueries({ queryKey: ["recent_invoices", company.id] });
  }, [queryClient, company?.id]);

  // Support the legacy refreshKey pattern: when it increments, invalidate cache
  useEffect(() => {
    if (refreshKey > lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      refresh();
    }
  }, [refreshKey, refresh]);

  const loading = dailyQuery.isLoading || weeklyQuery.isLoading || invoicesQuery.isLoading;
  const error =
    dailyQuery.error?.message ||
    weeklyQuery.error?.message ||
    invoicesQuery.error?.message ||
    null;

  return {
    dailyKpis: dailyQuery.data ?? null,
    weeklyKpis: weeklyQuery.data ?? null,
    recentInvoices: invoicesQuery.data ?? [],
    loading,
    error,
    refresh,
  };
}
