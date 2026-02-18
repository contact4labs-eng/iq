import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Users, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SupplierPerformanceSection } from "@/components/invoices/analytics/SupplierPerformance";
import { PriceVolatilitySection } from "@/components/invoices/analytics/PriceVolatility";
import { ExecutiveSummarySection } from "@/components/invoices/analytics/ExecutiveSummary";
import { CostAnalyticsSection } from "@/components/invoices/analytics/CostAnalytics";
import { useInvoiceAnalytics } from "@/hooks/useInvoiceAnalytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = [
  "hsl(207, 90%, 54%)",
  "hsl(152, 56%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 60%, 45%)",
];

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
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

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

  // Build chart data: products as data points with avg/min/max/latest
  const chartData = useMemo(() => {
    return filteredPriceData.map((p) => ({
      name: p.product_name.length > 20 ? p.product_name.slice(0, 18) + "…" : p.product_name,
      avg: p.avg_price,
      min: p.min_price,
      max: p.max_price,
      latest: p.latest_price,
    }));
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
    ? priceVolatility.reduce((max, p) => ((p.volatility ?? 0) > (max.volatility ?? 0) ? p : max), priceVolatility[0])
    : null;

  // Compute summary stats for Supplier Performance tab
  const highRiskCount = suppliers.filter((s) => s.risk_level === "high").length;
  const avgDependency =
    suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + (s.dependency_pct ?? 0), 0) / suppliers.length
      : 0;
  const topSupplier = suppliers.length > 0
    ? suppliers.reduce((max, s) => ((s.dependency_pct ?? 0) > (max.dependency_pct ?? 0) ? s : max), suppliers[0])
    : null;

  // Find most reliable supplier (lowest risk, most invoices)
  const reliableSupplier = suppliers.length > 0
    ? suppliers
        .filter((s) => s.risk_level === "low")
        .sort((a, b) => b.invoice_count - a.invoice_count)[0] ?? suppliers.reduce((best, s) => (s.invoice_count > best.invoice_count ? s : best), suppliers[0])
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
                  value={`${(topIncrease.volatility ?? 0).toFixed(1)}%`}
                  variant={topIncrease.level === "high" ? "destructive" : "warning"}
                  icon={<TrendingUp className="w-5 h-5 text-destructive" />}
                />
              )}
            </div>

            {/* Price Trends Chart with Supplier Filter */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{t("analytics.price_over_time")}</CardTitle>
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
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [`€${value.toFixed(2)}`, undefined]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="avg" stroke={CHART_COLORS[0]} name="Avg" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="latest" stroke={CHART_COLORS[1]} name="Latest" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="min" stroke={CHART_COLORS[2]} name="Min" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                      <Line type="monotone" dataKey="max" stroke={CHART_COLORS[3]} name="Max" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">{t("analytics.no_data")}</p>
                )}
              </CardContent>
            </Card>

            <PriceVolatilitySection data={filteredPriceData} />
            <CostAnalyticsSection data={costAnalytics} />
          </TabsContent>

          <TabsContent value="supplier-perf" className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mt-4">
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
              {reliableSupplier && (
                <SummaryCard
                  label={t("analytics.reliable_supplier")}
                  value={reliableSupplier.supplier_name}
                  variant="success"
                  icon={<ShieldCheck className="w-5 h-5 text-success" />}
                />
              )}
              {topSupplier && (
                <SummaryCard
                  label={topSupplier.supplier_name}
                  value={`${(topSupplier.dependency_pct ?? 0).toFixed(1)}%`}
                  variant={topSupplier.risk_level === "high" ? "destructive" : "warning"}
                  icon={<TrendingUp className="w-5 h-5 text-destructive" />}
                />
              )}
            </div>

            <SupplierPerformanceSection data={suppliers} priceData={priceVolatility} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
