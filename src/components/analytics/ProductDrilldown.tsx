import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Award, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PriceVolatility } from "@/hooks/useInvoiceAnalytics";

const CHART_COLORS = [
  "hsl(207, 90%, 54%)",
  "hsl(152, 56%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 60%, 45%)",
];

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

export function ProductDrilldown({ priceData }: { priceData: PriceVolatility[] }) {
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  const productNames = useMemo(() => {
    const names = new Set(priceData.map((p) => p.product_name));
    return Array.from(names).sort();
  }, [priceData]);

  const activeProduct = selectedProduct || productNames[0] || "";

  // All suppliers offering this product
  const productSuppliers = useMemo(
    () => priceData.filter((p) => p.product_name === activeProduct),
    [priceData, activeProduct]
  );

  // Best price supplier
  const bestSupplier = useMemo(() => {
    if (productSuppliers.length === 0) return null;
    return productSuppliers.reduce((best, s) =>
      s.latest_price < best.latest_price ? s : best
    );
  }, [productSuppliers]);

  // Comparison bar chart
  const chartData = useMemo(
    () =>
      productSuppliers
        .map((s) => ({
          name: s.supplier_name.length > 18 ? s.supplier_name.slice(0, 16) + "…" : s.supplier_name,
          fullName: s.supplier_name,
          latest: s.latest_price,
          avg: s.avg_price,
          isBest: bestSupplier?.supplier_name === s.supplier_name,
        }))
        .sort((a, b) => a.latest - b.latest),
    [productSuppliers, bestSupplier]
  );

  // Detect seasonal pattern (simplified: if min and max differ significantly with multiple data points)
  const hasSeasonalPattern = useMemo(() => {
    if (productSuppliers.length < 2) return false;
    return productSuppliers.some(
      (p) => p.max_price > 0 && p.min_price > 0 && (p.max_price - p.min_price) / p.avg_price > 0.15
    );
  }, [productSuppliers]);

  if (productNames.length === 0) {
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
      {/* Product selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={activeProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={t("analytics.select_product")} />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            {productNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {bestSupplier && (
          <Card className="border border-success/30 bg-success/5">
            <CardContent className="p-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">{t("analytics.best_price")}</span>
              <span className="text-sm font-bold text-success">{fmt(bestSupplier.latest_price)}</span>
              <span className="text-xs text-muted-foreground">— {bestSupplier.supplier_name}</span>
            </CardContent>
          </Card>
        )}

        {hasSeasonalPattern && (
          <Badge variant="outline" className="gap-1 text-warning border-warning/50">
            <TrendingUp className="w-3 h-3" />
            {t("analytics.seasonal_detected")}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Supplier price comparison chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("analytics.supplier_comparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickFormatter={(v) => `€${v}`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Bar dataKey="latest" radius={[0, 4, 4, 0]} name={t("analytics.latest_label")}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isBest ? "hsl(152, 56%, 45%)" : CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">{t("analytics.no_data")}</p>
            )}
          </CardContent>
        </Card>

        {/* Supplier detail cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t("analytics.supplier_details")}</h3>
          {productSuppliers.map((s, i) => {
            const pctChange = s.avg_price > 0 ? ((s.latest_price - s.avg_price) / s.avg_price) * 100 : 0;
            const isBest = bestSupplier?.supplier_name === s.supplier_name;
            return (
              <Card
                key={i}
                className={`border ${isBest ? "border-success/40 bg-success/5" : "border-border"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{s.supplier_name}</p>
                        {isBest && (
                          <Badge className="bg-success text-success-foreground text-[9px]">
                            {t("analytics.best_price")}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs mt-2">
                        <div>
                          <p className="text-muted-foreground">{t("analytics.avg_label")}</p>
                          <p className="font-medium text-foreground">{fmt(s.avg_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("analytics.latest_label")}</p>
                          <p className="font-medium text-foreground">{fmt(s.latest_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min</p>
                          <p className="font-medium text-foreground">{fmt(s.min_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Max</p>
                          <p className="font-medium text-foreground">{fmt(s.max_price)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {pctChange > 2 ? (
                        <div className="flex items-center gap-1 text-destructive">
                          <ArrowUpRight className="w-4 h-4" />
                          <span className="text-sm font-bold">+{pctChange.toFixed(1)}%</span>
                        </div>
                      ) : pctChange < -2 ? (
                        <div className="flex items-center gap-1 text-success">
                          <ArrowDownRight className="w-4 h-4" />
                          <span className="text-sm font-bold">{pctChange.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Minus className="w-4 h-4" />
                          <span className="text-sm font-bold">{t("analytics.stable")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
