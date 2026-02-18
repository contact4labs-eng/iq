import { useMemo, useState } from "react";
import type { SupplierPerformance, PriceVolatility, CostAnalytics } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Minus, Calculator, Crown,
  AlertTriangle, Lightbulb,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PIE_COLORS = [
  "hsl(217, 91%, 60%)", "hsl(152, 56%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(270, 50%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(330, 60%, 55%)", "hsl(60, 70%, 50%)",
];

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function KpiCard({ icon, label, value, sub, variant }: {
  icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode;
  variant: "primary" | "success" | "destructive" | "warning" | "default";
}) {
  const bg = {
    primary: "bg-primary/10 border-primary/20", success: "bg-success/10 border-success/20",
    destructive: "bg-destructive/10 border-destructive/20", warning: "bg-warning/10 border-warning/20",
    default: "bg-muted/50 border-border",
  };
  return (
    <Card className={`border ${bg[variant]}`}>
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
  const [costHistorySupplier, setCostHistorySupplier] = useState<string>("all");

  // --- KPIs ---
  const highestCostProduct = useMemo(() => {
    if (!priceData.length) return null;
    return priceData.reduce((max, p) =>
      (p.latest_price ?? p.avg_price) > (max.latest_price ?? max.avg_price) ? p : max, priceData[0]);
  }, [priceData]);

  const costTrend = useMemo(() => {
    if (!priceData.length) return "stable" as const;
    const avgLatest = priceData.reduce((s, p) => s + (p.latest_price ?? p.avg_price), 0) / priceData.length;
    const avgAvg = priceData.reduce((s, p) => s + p.avg_price, 0) / priceData.length;
    if (avgAvg === 0) return "stable" as const;
    const pct = ((avgLatest - avgAvg) / avgAvg) * 100;
    if (pct > 2) return "increasing" as const;
    if (pct < -2) return "decreasing" as const;
    return "stable" as const;
  }, [priceData]);

  // --- Pie ---
  const pieData = useMemo(() => {
    if (costAnalytics?.by_category?.length) {
      const total = costAnalytics.by_category.reduce((s, c) => s + c.total, 0);
      return costAnalytics.by_category.map(c => ({
        name: c.category || "Other", value: c.total,
        pct: total > 0 ? ((c.total / total) * 100).toFixed(1) : "0",
      }));
    }
    const totals: Record<string, number> = {};
    for (const s of suppliers) totals[s.supplier_name] = s.total_spend;
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return Object.entries(totals).map(([name, value]) => ({
      name, value, pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
    }));
  }, [costAnalytics, suppliers]);

  // --- Product Table ---
  const productTable = useMemo(() => {
    const totalCost = priceData.reduce((s, p) => s + (p.latest_price ?? p.avg_price), 0) || 1;
    return priceData.map(p => {
      const latest = p.latest_price ?? p.avg_price;
      const changePct = p.avg_price > 0 ? ((latest - p.avg_price) / p.avg_price) * 100 : 0;
      const trend: "up" | "down" | "stable" = changePct > 2 ? "up" : changePct < -2 ? "down" : "stable";
      return {
        product: p.product_name, supplier: p.supplier_name, unitCost: latest,
        changePct, trend, impactScore: Math.round((latest / totalCost) * 100),
      };
    }).sort((a, b) => b.impactScore - a.impactScore);
  }, [priceData]);

  // --- Simulator ---
  const simulatorData = useMemo(() => {
    if (!productTable.length) return [];
    return productTable.slice(0, 10).map(p => {
      const requiredRevenue = p.unitCost / (1 - targetMargin / 100);
      return { ...p, requiredRevenue, gap: requiredRevenue - p.unitCost };
    });
  }, [productTable, targetMargin]);

  // --- Bar chart: Cost vs Required Selling Price ---
  const barChartData = useMemo(() => {
    return simulatorData.map(p => ({
      name: p.product.length > 15 ? p.product.slice(0, 13) + "…" : p.product,
      cost: p.unitCost,
      sellingPrice: p.requiredRevenue,
    }));
  }, [simulatorData]);

  // --- Cost Alerts: products with >5% increase ---
  const costAlerts = useMemo(() => {
    return productTable
      .filter(p => p.changePct > 5)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 5);
  }, [productTable]);

  // --- Recommendations ---
  const recommendations = useMemo(() => {
    const recs: string[] = [];

    // Find products available from multiple suppliers with price difference
    const productSuppliers: Record<string, { supplier: string; cost: number }[]> = {};
    for (const p of priceData) {
      if (!productSuppliers[p.product_name]) productSuppliers[p.product_name] = [];
      productSuppliers[p.product_name].push({ supplier: p.supplier_name, cost: p.latest_price ?? p.avg_price });
    }
    for (const [product, sups] of Object.entries(productSuppliers)) {
      if (sups.length >= 2) {
        const sorted = [...sups].sort((a, b) => a.cost - b.cost);
        const cheapest = sorted[0];
        const most = sorted[sorted.length - 1];
        if (most.cost > cheapest.cost * 1.05) {
          const saving = most.cost - cheapest.cost;
          recs.push(
            t("analytics.pm_rec_switch")
              .replace("{product}", product)
              .replace("{from}", most.supplier)
              .replace("{to}", cheapest.supplier)
              .replace("{saving}", fmt(saving))
          );
        }
      }
    }

    // High-impact cost increases
    const bigIncrease = costAlerts[0];
    if (bigIncrease) {
      recs.push(
        t("analytics.pm_rec_increase")
          .replace("{product}", bigIncrease.product)
          .replace("{pct}", bigIncrease.changePct.toFixed(1))
          .replace("{supplier}", bigIncrease.supplier)
      );
    }

    // Consolidation
    const multiSup = Object.entries(productSuppliers).filter(([, s]) => s.length >= 2);
    if (multiSup.length > 0) {
      recs.push(t("analytics.pm_rec_consolidate").replace("{count}", String(multiSup.length)));
    }

    return recs.slice(0, 4);
  }, [priceData, costAlerts, t]);

  // --- Cost History (monthly trends) ---
  const costHistoryData = useMemo(() => {
    if (!costAnalytics?.monthly_trends?.length) return [];
    return costAnalytics.monthly_trends.map(m => ({
      month: m.month,
      total: m.total,
    }));
  }, [costAnalytics]);

  const supplierNames = useMemo(() => {
    return Array.from(new Set(priceData.map(p => p.supplier_name))).sort();
  }, [priceData]);

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
          value={fmt(totalSpend)}
          variant="primary"
        />
        <KpiCard
          icon={<Crown className="w-5 h-5 text-warning" />}
          label={t("analytics.pm_highest_product")}
          value={highestCostProduct ? highestCostProduct.product_name : "—"}
          sub={highestCostProduct ? fmt(highestCostProduct.latest_price ?? highestCostProduct.avg_price) : undefined}
          variant="warning"
        />
        <KpiCard
          icon={costTrend === "increasing" ? <TrendingUp className="w-5 h-5 text-destructive" />
            : costTrend === "decreasing" ? <TrendingDown className="w-5 h-5 text-success" />
            : <Minus className="w-5 h-5 text-muted-foreground" />}
          label={t("analytics.pm_cost_trend")}
          value={t(`analytics.pm_trend_${costTrend}`)}
          variant={costTrend === "increasing" ? "destructive" : costTrend === "decreasing" ? "success" : "default"}
        />
      </div>

      {/* Cost Alerts */}
      {costAlerts.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("analytics.pm_cost_alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {costAlerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-destructive/15 bg-card/80 px-3 py-2">
                  <TrendingUp className="w-4 h-4 text-destructive shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.product}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.supplier} · <span className="text-destructive font-medium">+{a.changePct.toFixed(1)}%</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-success" />
              {t("analytics.pm_recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-success font-bold mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("analytics.pm_cost_breakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="flex justify-center">
              <div className="w-full max-w-[340px] h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50} paddingAngle={2}
                      label={({ name, pct }) => `${name}: ${pct}%`} labelLine={{ strokeWidth: 1 }}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number, name: string) => [fmt(value), name]}
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
                  <TableCell className="text-right">{fmt(p.unitCost)}</TableCell>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("analytics.no_data")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Margin Simulator + Bar Chart */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            {t("analytics.pm_simulator")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              {t("analytics.pm_target_margin")}
            </label>
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <Slider value={[targetMargin]} onValueChange={(v) => setTargetMargin(v[0])}
                min={5} max={80} step={1} className="flex-1" />
              <Input type="number" value={targetMargin}
                onChange={(e) => setTargetMargin(Math.max(5, Math.min(80, Number(e.target.value) || 30)))}
                className="w-20 h-9 text-center" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Bar Chart */}
          {barChartData.length > 0 && (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [fmt(value)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="cost" name={t("analytics.pm_unit_cost")} fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sellingPrice" name={t("analytics.pm_selling_price")} fill="hsl(152, 56%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("analytics.col_product")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_unit_cost")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_selling_price")}</TableHead>
                <TableHead className="text-right">{t("analytics.pm_margin_gap")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulatorData.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.product}</TableCell>
                  <TableCell className="text-right">{fmt(p.unitCost)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{fmt(p.requiredRevenue)}</TableCell>
                  <TableCell className="text-right text-success font-medium">+{fmt(p.gap)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost History Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">{t("analytics.pm_cost_history")}</CardTitle>
          <Select value={costHistorySupplier} onValueChange={setCostHistorySupplier}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("analytics.all_suppliers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics.all_suppliers")}</SelectItem>
              {supplierNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {costHistoryData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costHistoryData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [fmt(value), t("analytics.spend_label")]}
                  />
                  <Line type="monotone" dataKey="total" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4 }} name={t("analytics.spend_label")} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">{t("analytics.no_data")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
