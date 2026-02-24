import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Users, Search, PieChart, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SupplierPerformanceSection } from "@/components/invoices/analytics/SupplierPerformance";
import { ExecutiveSummarySection } from "@/components/invoices/analytics/ExecutiveSummary";
import { CostAnalyticsSection } from "@/components/invoices/analytics/CostAnalytics";
import { PriceTrendAnalysis } from "@/components/analytics/PriceTrendAnalysis";
import { ProfitMarginsTab } from "@/components/analytics/ProfitMarginsTab";
import { useInvoiceAnalytics } from "@/hooks/useInvoiceAnalytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ANALYTICS_COLORS, CHART_TOOLTIP_STYLE, formatCurrency,
  type DateRangePreset, getDateRangeStart,
} from "@/components/analytics/constants";

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
    <Card className={`border ${bgMap[variant ?? "default"]} shadow-sm hover:shadow-md transition-shadow`}>
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
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangePreset>("all");

  // Derive unique supplier names from price volatility data
  const supplierNames = useMemo(() => {
    const names = new Set(priceVolatility.map((p) => p.supplier_name));
    return Array.from(names).sort();
  }, [priceVolatility]);

  // Filter price data by selected supplier
  const filteredPriceData = useMemo(() => {
    if (selectedSupplier === "all") return priceVolatility;
    return priceVolatility.filter((p) => p.supplier_name === selectedSupplier);
  }, [priceVolatility, selectedSupplier]);

  // Filter cost analytics monthly trends by date range
  const filteredCostAnalytics = useMemo(() => {
    if (!costAnalytics) return null;
    const rangeStart = getDateRangeStart(dateRange);
    if (!rangeStart) return costAnalytics;
    return {
      ...costAnalytics,
      monthly_trends: (costAnalytics.monthly_trends ?? []).filter((m) => {
        try {
          return new Date(m.month) >= rangeStart;
        } catch { return true; }
      }),
    };
  }, [costAnalytics, dateRange]);

  // Build chart data: products as bars with avg vs latest (correct visualization)
  const chartData = useMemo(() => {
    return filteredPriceData
      .filter((p) => p.avg_price > 0 || p.latest_price > 0)
      .map((p) => ({
        name: p.product_name.length > 18 ? p.product_name.slice(0, 16) + "…" : p.product_name,
        fullName: p.product_name,
        avg: p.avg_price,
        latest: p.latest_price,
      }))
      .sort((a, b) => b.latest - a.latest)
      .slice(0, 15);
  }, [filteredPriceData]);

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
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
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
    ? priceVolatility.reduce((max, p) => ((p.volatility ?? 0) > (max.volatility ?? 0) ? p : max), priceVolatility[0])
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with date range picker */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.analytics")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">{t("analytics.range_30d")}</SelectItem>
                <SelectItem value="90d">{t("analytics.range_90d")}</SelectItem>
                <SelectItem value="6m">{t("analytics.range_6m")}</SelectItem>
                <SelectItem value="1y">{t("analytics.range_1y")}</SelectItem>
                <SelectItem value="all">{t("analytics.range_all")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ExecutiveSummarySection data={executive} costAnalytics={costAnalytics} />

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
            <TabsTrigger value="price-analysis" className="gap-1.5">
              <Search className="w-4 h-4" />
              {t("analytics.tab_price_analysis")}
            </TabsTrigger>
            <TabsTrigger value="profit-margins" className="gap-1.5">
              <PieChart className="w-4 h-4" />
              {t("analytics.tab_profit_margins")}
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
                  value={`${(topIncrease.volatility ?? 0).toFixed(1)}%`}
                  variant={topIncrease.level === "high" ? "destructive" : "warning"}
                  icon={<TrendingUp className="w-5 h-5 text-destructive" />}
                />
              )}
            </div>

            {/* Product Price Comparison (bar chart - correct visualization for this data) */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{t("analytics.price_comparison")}</CardTitle>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t("analytics.all_suppliers")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("analytics.all_suppliers")}</SelectItem>
                    {supplierNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      />
                      <Legend />
                      <Bar dataKey="avg" name={t("analytics.avg_label")} fill={ANALYTICS_COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="latest" name={t("analytics.latest_label")} fill={ANALYTICS_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">{t("analytics.no_data")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <CostAnalyticsSection data={filteredCostAnalytics} suppliers={suppliers} />
          </TabsContent>

          <TabsContent value="supplier-perf" className="space-y-6">
            <SupplierPerformanceSection data={suppliers} priceData={priceVolatility} />
          </TabsContent>

          <TabsContent value="price-analysis">
            <PriceTrendAnalysis priceData={priceVolatility} suppliers={suppliers} />
          </TabsContent>

          <TabsContent value="profit-margins">
            <ProfitMarginsTab
              priceData={priceVolatility}
              suppliers={suppliers}
              costAnalytics={filteredCostAnalytics}
              totalSpend={executive?.total_spend ?? 0}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
