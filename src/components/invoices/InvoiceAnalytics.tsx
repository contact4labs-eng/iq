import { useInvoiceAnalytics } from "@/hooks/useInvoiceAnalytics";
import { ExecutiveSummarySection } from "./analytics/ExecutiveSummary";
import { SupplierPerformanceSection } from "./analytics/SupplierPerformance";
import { CostAnalyticsSection } from "./analytics/CostAnalytics";
import { PriceVolatilitySection } from "./analytics/PriceVolatility";
import { Skeleton } from "@/components/ui/skeleton";

export function InvoiceAnalytics() {
  const { executive, suppliers, costAnalytics, priceVolatility, loading, error } = useInvoiceAnalytics();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ExecutiveSummarySection data={executive} />
      <SupplierPerformanceSection data={suppliers} />
      <CostAnalyticsSection data={costAnalytics} />
      <PriceVolatilitySection data={priceVolatility} />
    </div>
  );
}
