import { useMemo, useState } from "react";
import type { SupplierPerformance, PriceVolatility, CostAnalytics } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Minus, Calculator, Package, Crown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PIE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(152, 56%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(330, 60%, 55%)",
  "hsl(60, 70%, 50%)",
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function KpiCard({ icon, label, value, sub, variant }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  variant: "primary" | "success" | "destructive" | "warning" | "default";
}) {
  const bgMap = {
    primary: "bg-primary/10 border-primary/20",
    success: "bg-success/10 border-success/20",
    destructive: "bg-destructive/10 border-destructive/20",
    warning: "bg-warning/10 border-warning/20",
    default: "bg-muted/50 border-border",
  };
  return (
    <Card className={`border ${bgMap[variant]}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  priceData: PriceVolatility[];
  suppliers: SupplierPerformance[];
  costAnalytics: CostAnalytics | null;
  totalSpend: number;
}

export function ProfitMarginsTab({ priceData, suppliers, costAnalytics, totalSpend }: Props) {
  const { t } = useLanguage();
  const [targetMargin, setTargetMargin] = useState(30);

  // --- KPI computations ---
  const highestCostProduct = useMemo(() => {
    if (!priceData.length) return null;
    return priceData.reduce((max, p) =>
      (p.latest_price ?? p.avg_price) > (max.latest_price ?? max.avg_price) ? p : max
    , priceData[0]);
  }, [priceData]);

  // Cost trend: compare latest vs avg to determine MoM direction
  const costTrend = useMemo(() => {
    if (!priceData.length) return "stable" as const;
    const avgLatest = priceData.reduce((s, p) => s + (p.latest_price ?? p.avg_price), 0) / priceData.length;
    const avgAvg = priceData.reduce((s, p) => s + p.avg_price, 0) / priceData.length;
    if (avgAvg === 0) return "stable" as const;
    const pctChange = ((avgLatest - avgAvg) / avgAvg) * 100;
    if (pctChange > 2) return "increasing" as const;
    if (pctChange < -2) return "decreasing" as const;
    return "stable" as const;
  }, [priceData]);

  // --- Cost Breakdown Pie Data ---
  const pieData = useMemo(() => {
    if (costAnalytics?.by_category?.length) {
      const total = costAnalytics.by_category.reduce((s, c) => s + c.total, 0);
      return costAnalytics.by_category.map(c => ({
        name: c.category || "Other",
        value: c.total,
        pct: total > 0 ? ((c.total / total) * 100).toFixed(1) : "0",
      }));
    }
    // Fallback: group by supplier
    const supplierTotals: Record<string, number> = {};
    for (const s of suppliers) {
      supplierTotals[s.supplier_name] = s.total_spend;
    }
    const total = Object.values(supplierTotals).reduce((s, v) => s + v, 0);
    return Object.entries(supplierTotals).map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
    }));
  }, [costAnalytics, suppliers]);

  // --- Product Cost Table ---
  const productTable = useMemo(() => {
    const totalCost = priceData.reduce((s, p) => s + (p.latest_price ?? p.avg_price), 0) || 1;
    return priceData.map(p => {
      const latest = p.latest_price ?? p.avg_price;
      const changePct = p.avg_price > 0 ? ((latest - p.avg_price) / p.avg_price) * 100 : 0;
      const trend: "up" | "down" | "stable" = changePct > 2 ? "up" : changePct < -2 ? "down" : "stable";
      const impactScore = Math.round((latest / totalCost) * 100);
      return {
        product: p.product_name,
        supplier: p.supplier_name,
        unitCost: latest,
        changePct,
        trend,
        impactScore,
      };
    }).sort((a, b) => b.impactScore - a.impactScore);
  }, [priceData]);

  // --- Margin Simulator ---
  const simulatorData = useMemo(() => {
    if (!productTable.length) return [];
    return productTable.slice(0, 10).map(p => {
      const requiredRevenue = p.unitCost / (1 - targetMargin / 100);
      const currentMarginPct = totalSpend > 0
        ? ((requiredRevenue - p.unitCost) / requiredRevenue) * 100
        : targetMargin;
      return {
        ...p,
        requiredRevenue,
        currentMarginPct,
        gap: requiredRevenue - p.unitCost,
      };
    });
  }, [productTable, targetMargin, totalSpend]);

  const trendIcon = (tr: "up" | "down" | "stable") => {
    if (tr === "up") return <TrendingUp className="w-4 h-4 text-destructive" />;
    if (tr === "down") return <TrendingDown className="w-4 h-4 text-success" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const trendColor = (tr: "up" | "down" | "stable") => {
    if (tr === "up") return "text-destructive";
    if (tr === "down") return "text-success";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          label={t("analytics.pm_total_cost")}
          value={formatCurrency(totalSpend)}
          variant="primary"
        />
        <KpiCard
          icon={<Crown className="w-5 h-5 text-warning" />}
          label={t("analytics.pm_highest_product")}
          value={highestCostProduct ? highestCostProduct.product_name : "—"}
          sub={highestCostProduct ? formatCurrency(highestCostProduct.latest_price ?? highestCostProduct.avg_price) : undefined}
          variant="warning"
        />
        <KpiCard
          icon={costTrend === "increasing"
            ? <TrendingUp className="w-5 h-5 text-destructive" />
            : costTrend === "decreasing"
            ? <TrendingDown className="w-5 h-5 text-success" />
            : <Minus className="w-5 h-5 text-muted-foreground" />
          }
          label={t("analytics.pm_cost_trend")}
          value={t(`analytics.pm_trend_${costTrend}`)}
          variant={costTrend === "increasing" ? "destructive" : costTrend === "decreasing" ? "success" : "default"}
        />
      </div>

      {/* Cost Breakdown Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("analytics.pm_cost_breakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full max-w-[300px] h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ name, pct }) => `${name}: ${pct}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">{t("analytics.no_data")}</p>
          )}
        </CardContent>
      </Card>

      {/* Product Cost Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("analytics.pm_product_costs")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("analytics.col_product")}</TableHead>
                <TableHead>{t("analytics.col_supplier")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_unit_cost")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_cost_change")}</TableHead>
                <TableHead>{t("analytics.col_trend")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_impact")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productTable.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.product}</TableCell>
                  <TableCell className="text-muted-foreground">{p.supplier}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.unitCost)}</TableCell>
                  <TableCell className={`text-right font-medium ${trendColor(p.trend)}`}>
                    {p.changePct > 0 ? "+" : ""}{p.changePct.toFixed(1)}%
                  </TableCell>
                  <TableCell>{trendIcon(p.trend)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.impactScore >= 20 ? "destructive" : p.impactScore >= 10 ? "default" : "secondary"}>
                      {p.impactScore}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {productTable.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t("analytics.no_data")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Margin Impact Simulator */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            {t("analytics.pm_simulator")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              {t("analytics.pm_target_margin")}
            </label>
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <Slider
                value={[targetMargin]}
                onValueChange={(v) => setTargetMargin(v[0])}
                min={5}
                max={80}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Math.max(5, Math.min(80, Number(e.target.value) || 30)))}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("analytics.col_product")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_unit_cost")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_required_revenue")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_margin_gap")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulatorData.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.product}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.unitCost)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatCurrency(p.requiredRevenue)}</TableCell>
                  <TableCell className="text-right text-success font-medium">+{formatCurrency(p.gap)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
