import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PriceVolatility, SupplierPerformance } from "@/hooks/useInvoiceAnalytics";

const CHART_COLORS = [
  "hsl(207, 90%, 54%)",
  "hsl(152, 56%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(330, 60%, 55%)",
  "hsl(60, 70%, 50%)",
];

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function computeConsistencyScore(products: PriceVolatility[]): number {
  if (products.length === 0) return 50;
  const avgVol = products.reduce((s, p) => s + (p.volatility ?? 0), 0) / products.length;
  // Lower volatility = higher consistency. Score 0-100
  return Math.max(0, Math.min(100, Math.round(100 - avgVol * 5)));
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-success/10 border-success/30";
  if (score >= 50) return "bg-warning/10 border-warning/30";
  return "bg-destructive/10 border-destructive/30";
}

export function SupplierDrilldown({
  priceData,
  suppliers,
}: {
  priceData: PriceVolatility[];
  suppliers: SupplierPerformance[];
}) {
  const { t } = useLanguage();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");

  const supplierNames = useMemo(() => {
    const names = new Set(priceData.map((p) => p.supplier_name));
    return Array.from(names).sort();
  }, [priceData]);

  // Auto-select first supplier
  const activeSupplier = selectedSupplier || supplierNames[0] || "";

  const supplierProducts = useMemo(
    () => priceData.filter((p) => p.supplier_name === activeSupplier),
    [priceData, activeSupplier]
  );

  const supplierInfo = useMemo(
    () => suppliers.find((s) => s.supplier_name === activeSupplier),
    [suppliers, activeSupplier]
  );

  const consistencyScore = useMemo(() => computeConsistencyScore(supplierProducts), [supplierProducts]);

  // Product price comparison bar chart data
  const barData = useMemo(
    () =>
      supplierProducts.map((p) => ({
        name: p.product_name.length > 15 ? p.product_name.slice(0, 13) + "…" : p.product_name,
        fullName: p.product_name,
        avg: p.avg_price,
        latest: p.latest_price,
        min: p.min_price,
        max: p.max_price,
      })),
    [supplierProducts]
  );

  // Spend distribution pie chart
  const pieData = useMemo(
    () =>
      supplierProducts
        .map((p) => ({ name: p.product_name, value: p.avg_price }))
        .sort((a, b) => b.value - a.value),
    [supplierProducts]
  );

  if (supplierNames.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          {t("analytics.no_data")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Supplier selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={activeSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={t("analytics.select_supplier")} />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            {supplierNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Consistency score badge */}
        <Card className={`border ${getScoreBg(consistencyScore)}`}>
          <CardContent className="p-3 flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${getScoreColor(consistencyScore)}`} />
            <span className="text-xs text-muted-foreground">{t("analytics.consistency_score")}</span>
            <span className={`text-lg font-bold font-display ${getScoreColor(consistencyScore)}`}>
              {consistencyScore}
            </span>
          </CardContent>
        </Card>

        {supplierInfo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="w-3.5 h-3.5" />
            <span>{supplierProducts.length} {t("analytics.products_label")}</span>
            <span>•</span>
            <span>{supplierInfo.invoice_count} {t("analytics.invoices_label")}</span>
            <span>•</span>
            <span>{fmt(supplierInfo.total_spend)}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Product price bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("analytics.product_prices")}</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number, name: string) => [fmt(value), name]}
                  />
                  <Legend />
                  <Bar dataKey="avg" fill={CHART_COLORS[0]} name={t("analytics.avg_label")} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="latest" fill={CHART_COLORS[1]} name={t("analytics.latest_label")} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">{t("analytics.no_data")}</p>
            )}
          </CardContent>
        </Card>

        {/* Spend distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("analytics.spend_distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">{t("analytics.no_data")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("analytics.product_detail")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-3 text-muted-foreground font-medium">{t("analytics.product")}</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium text-right">{t("analytics.avg_label")}</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium text-right">{t("analytics.latest_label")}</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium text-right">Min</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium text-right">Max</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium text-center">{t("analytics.trend")}</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium text-right">{t("analytics.volatility")}</th>
                </tr>
              </thead>
              <tbody>
                {supplierProducts.map((p, i) => {
                  const pctChange = p.avg_price > 0 ? ((p.latest_price - p.avg_price) / p.avg_price) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-medium text-foreground">{p.product_name}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmt(p.avg_price)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-foreground">{fmt(p.latest_price)}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmt(p.min_price)}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmt(p.max_price)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {pctChange > 2 ? (
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-xs text-destructive">+{pctChange.toFixed(1)}%</span>
                          </div>
                        ) : pctChange < -2 ? (
                          <div className="flex items-center justify-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-success" />
                            <span className="text-xs text-success">{pctChange.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{t("analytics.stable")}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge
                          variant={p.level === "high" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {(p.volatility ?? 0).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
