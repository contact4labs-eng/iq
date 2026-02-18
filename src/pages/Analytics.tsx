import { TrendingUp, TrendingDown, AlertTriangle, Users } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SupplierPerformanceSection } from "@/components/invoices/analytics/SupplierPerformance";
import { PriceVolatilitySection } from "@/components/invoices/analytics/PriceVolatility";
import { ExecutiveSummarySection } from "@/components/invoices/analytics/ExecutiveSummary";
import { CostAnalyticsSection } from "@/components/invoices/analytics/CostAnalytics";
import { useInvoiceAnalytics } from "@/hooks/useInvoiceAnalytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SummaryCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: "warning" | "success" | "destructive" | "default";
}) {
  const bgMap = {
    warning: "bg-warning/10 border-warning/30",
    success: "bg-success/10 border-success/30",
    destructive: "bg-destructive/10 border-destructive/30",
    default: "bg-muted/50 border-border",
  };
  return (
    <Card className={`border ${bgMap[variant ?? "default"]}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold font-display text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const Analytics = () => {
  const { t } = useLanguage();
  const { executive, suppliers, costAnalytics, priceVolatility, loading, error } = useInvoiceAnalytics();

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  // Compute summary stats for Price Trends tab
  const highVolatilityCount = priceVolatility.filter((p) => p.level === "high").length;
  const avgVolatility =
    priceVolatility.length > 0
      ? priceVolatility.reduce((sum, p) => sum + (p.volatility ?? 0), 0) / priceVolatility.length
      : 0;
  const topIncrease = priceVolatility.length > 0
    ? priceVolatility.reduce((max, p) => (p.volatility > max.volatility ? p : max), priceVolatility[0])
    : null;

  // Compute summary stats for Supplier Performance tab
  const highRiskCount = suppliers.filter((s) => s.risk_level === "high").length;
  const avgDependency =
    suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + (s.dependency_pct ?? 0), 0) / suppliers.length
      : 0;
  const topSupplier = suppliers.length > 0
    ? suppliers.reduce((max, s) => (s.dependency_pct > max.dependency_pct ? s : max), suppliers[0])
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.analytics")}</h1>
          </div>
        </div>

        <ExecutiveSummarySection data={executive} />

        <Tabs defaultValue="price-trends">
          <TabsList>
            <TabsTrigger value="price-trends" className="gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {t("analytics.tab_price_trends")}
            </TabsTrigger>
            <TabsTrigger value="supplier-perf" className="gap-1.5">
              <Users className="w-4 h-4" />
              {t("analytics.tab_supplier_perf")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="price-trends" className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mt-4">
              <SummaryCard
                label={t("analytics.high_volatility_items")}
                value={String(highVolatilityCount)}
                variant={highVolatilityCount > 0 ? "destructive" : "success"}
                icon={
                  <AlertTriangle
                    className={`w-5 h-5 ${highVolatilityCount > 0 ? "text-destructive" : "text-success"}`}
                  />
                }
              />
              <SummaryCard
                label={t("analytics.avg_volatility")}
                value={`${avgVolatility.toFixed(1)}%`}
                variant={avgVolatility > 15 ? "warning" : "default"}
                icon={
                  avgVolatility > 15 ? (
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-success" />
                  )
                }
              />
              {topIncrease && (
                <SummaryCard
                  label={topIncrease.supplier_name}
                  value={`${topIncrease.volatility.toFixed(1)}%`}
                  variant={topIncrease.level === "high" ? "destructive" : "warning"}
                  icon={<TrendingUp className="w-5 h-5 text-destructive" />}
                />
              )}
            </div>

            <PriceVolatilitySection data={priceVolatility} />
            <CostAnalyticsSection data={costAnalytics} />
          </TabsContent>

          <TabsContent value="supplier-perf" className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mt-4">
              <SummaryCard
                label={t("analytics.high_risk_suppliers")}
                value={String(highRiskCount)}
                variant={highRiskCount > 0 ? "destructive" : "success"}
                icon={
                  <AlertTriangle
                    className={`w-5 h-5 ${highRiskCount > 0 ? "text-destructive" : "text-success"}`}
                  />
                }
              />
              <SummaryCard
                label={t("analytics.avg_dependency")}
                value={`${avgDependency.toFixed(1)}%`}
                variant={avgDependency > 30 ? "warning" : "default"}
                icon={
                  avgDependency > 30 ? (
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-success" />
                  )
                }
              />
              {topSupplier && (
                <SummaryCard
                  label={topSupplier.supplier_name}
                  value={`${topSupplier.dependency_pct.toFixed(1)}%`}
                  variant={topSupplier.risk_level === "high" ? "destructive" : "warning"}
                  icon={<TrendingUp className="w-5 h-5 text-destructive" />}
                />
              )}
            </div>

            <SupplierPerformanceSection data={suppliers} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
