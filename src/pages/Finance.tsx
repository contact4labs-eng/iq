import { useState, useMemo } from "react";
import {
  Wallet, Plus, TrendingUp, TrendingDown,
  PieChart as PieChartIcon, Activity, Users, FileText, ArrowUpRight,
  ArrowDownRight, Database, Search, Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useFinanceDashboard } from "@/hooks/useFinanceDashboard";
import { useBusinessInsights } from "@/hooks/useBusinessInsights";
import { useInvoiceAnalytics } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddRevenueModal } from "@/components/finance/AddRevenueModal";
import { AddExpenseModal } from "@/components/finance/AddExpenseModal";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie,
  AreaChart, Area, LineChart, Line, Tooltip, ResponsiveContainer,
} from "recharts";
import { useFinanceExtras } from "@/hooks/useFinanceExtras";
import { useProducts } from "@/hooks/useProducts";
import { useIngredients } from "@/hooks/useIngredients";
import { calculateAllProductCosts } from "@/hooks/useProductCost";
import { useMarginThresholds } from "@/hooks/useMarginThresholds";
import { ProfitabilityCalendar } from "@/components/finance/ProfitabilityCalendar";
import { SupplierPerformanceSection } from "@/components/invoices/analytics/SupplierPerformance";
import { ExecutiveSummarySection } from "@/components/invoices/analytics/ExecutiveSummary";
import { PriceTrendAnalysis } from "@/components/analytics/PriceTrendAnalysis";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { seedDemoData } from "@/utils/seedDemoData";
import { type DateRangePreset } from "@/components/analytics/constants";

const safe = (v: any): number => (v == null || isNaN(v)) ? 0 : Number(v);

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function fmtShort(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtCompact(v: number) {
  if (Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(v);
  }
  return fmtShort(v);
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

/* ── Tiny sparkline component ─────────────────────────────── */
function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const sparkData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={sparkData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Finance KPI Card ─────────────────────────────────────── */
function KpiCard({
  title, value, pctChange, sparkline, sparkColor, icon: Icon, accentClass,
}: {
  title: string;
  value: number;
  pctChange?: number;
  sparkline?: number[];
  sparkColor: string;
  icon: React.ElementType;
  accentClass: string;
}) {
  const pct = pctChange ?? 0;
  const isUp = pct >= 0;
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${accentClass}`} />
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
          </div>
          {pct !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${isUp ? "text-success" : "text-destructive"}`}>
              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isUp ? "+" : ""}{pct.toFixed(1)}%
            </span>
          )}
        </div>
        <p className={`text-xl font-bold ${accentClass}`}>{fmtCompact(value)}</p>
        {sparkline && sparkline.length > 0 && (
          <div className="mt-2 -mx-1">
            <MiniSparkline data={sparkline} color={sparkColor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main Component ───────────────────────────────────────── */
const Finance = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { error } = useFinanceDashboard(refreshKey);
  const { kpi, topSuppliers, invoiceActivity, loading: insightsLoading } = useBusinessInsights(refreshKey);
  const { monthlyPL, expenseBreakdown, monthlyTrends } = useFinanceExtras(refreshKey);
  const {
    executive, suppliers, costAnalytics, priceVolatility,
    loading: analyticsLoading, error: analyticsError,
  } = useInvoiceAnalytics();
  const { data: products, loading: productsLoading } = useProducts(refreshKey);
  const { data: ingredients } = useIngredients(refreshKey);
  const { getMarginColor } = useMarginThresholds(refreshKey);
  const { t } = useLanguage();
  const { company } = useAuth();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  // Active top-level tab
  const [activeTab, setActiveTab] = useState("financial-overview");

  // Analytics-specific state
  const [dateRange, setDateRange] = useState<DateRangePreset>("all");

  const trendConfig: ChartConfig = {
    revenue: { label: t("dashboard.revenue"), color: "hsl(var(--success))" },
    expenses: { label: t("dashboard.expenses"), color: "hsl(var(--destructive))" },
  };

  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const onDataChanged = () => setRefreshKey((k) => k + 1);

  const handleSeedData = async () => {
    if (!company?.id) return;
    setSeeding(true);
    const result = await seedDemoData(company.id);
    setSeeding(false);
    if (result.success) {
      toast({ title: "Demo data added", description: result.message });
      onDataChanged();
    } else {
      toast({ title: "Seed failed", description: result.message, variant: "destructive" });
    }
  };

  // Profit margin data from products (COGS)
  const [costMap, setCostMap] = useState<Map<string, number>>(new Map());
  useMemo(() => {
    if (products.length > 0 && ingredients.length > 0) {
      calculateAllProductCosts(products, ingredients).then(setCostMap);
    }
  }, [products, ingredients]);

  const marginData = useMemo(() => {
    if (products.length === 0 || costMap.size === 0) return null;

    const marginFn = (sell: number, cost: number) =>
      sell > 0 ? ((sell - cost) / sell) * 100 : 0;

    const productMargins = products.map((p) => {
      const cost = costMap.get(p.id) ?? 0;
      const mDinein = marginFn(p.selling_price_dinein, cost);
      const mDelivery = marginFn(p.selling_price_delivery, cost);
      const color = getMarginColor(p.category, mDinein > 0 ? mDinein : mDelivery);
      return { name: p.name, category: p.category, cost, mDinein, mDelivery, color };
    });

    const withDinein = productMargins.filter((p) => p.mDinein > 0);
    const withDelivery = productMargins.filter((p) => p.mDelivery > 0);
    const avgDinein = withDinein.length > 0
      ? withDinein.reduce((s, p) => s + p.mDinein, 0) / withDinein.length : 0;
    const avgDelivery = withDelivery.length > 0
      ? withDelivery.reduce((s, p) => s + p.mDelivery, 0) / withDelivery.length : 0;

    const greenCount = productMargins.filter((p) => p.color === "green").length;
    const yellowCount = productMargins.filter((p) => p.color === "yellow").length;
    const redCount = productMargins.filter((p) => p.color === "red").length;

    // Category averages
    const catMap = new Map<string, { sum: number; count: number }>();
    productMargins.forEach((p) => {
      const m = p.mDinein > 0 ? p.mDinein : p.mDelivery;
      if (m > 0) {
        const prev = catMap.get(p.category) ?? { sum: 0, count: 0 };
        catMap.set(p.category, { sum: prev.sum + m, count: prev.count + 1 });
      }
    });
    const categories = Array.from(catMap.entries())
      .map(([cat, v]) => ({ category: cat, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg);

    return { avgDinein, avgDelivery, greenCount, yellowCount, redCount, total: products.length, categories };
  }, [products, costMap, getMarginColor]);

  // Determine if we're on an analytics tab (to show analytics KPIs vs finance KPIs)
  const isAnalyticsTab = activeTab !== "financial-overview";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <Wallet className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.finance")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("insights.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date range picker — shown on analytics tabs */}
            {isAnalyticsTab && (
              <div className="flex items-center gap-2 mr-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
                  <SelectTrigger className="w-[140px] h-9">
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
            )}
            {/* Quick actions — shown on financial overview */}
            {!isAnalyticsTab && (
              <>
                <Button size="sm" className="gap-1.5" onClick={() => setRevenueOpen(true)}>
                  <Plus className="w-4 h-4" /> {t("finance.add_revenue")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
                  <Plus className="w-4 h-4" /> {t("finance.add_expense")}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={handleSeedData} disabled={seeding}>
                  <Database className="w-4 h-4" /> {seeding ? "Seeding..." : "Demo Data"}
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── KPI Row: switches based on active tab ── */}
        {isAnalyticsTab ? (
          analyticsLoading ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <ExecutiveSummarySection data={executive} costAnalytics={costAnalytics} />
          )
        ) : (
          insightsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
          ) : kpi ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard
                title={t("insights.revenue_month")}
                value={kpi.revenue}
                pctChange={kpi.revenuePct}
                sparkline={kpi.revenueSparkline}
                sparkColor="hsl(142, 71%, 45%)"
                icon={TrendingUp}
                accentClass="text-success"
              />
              <KpiCard
                title={t("insights.expenses_month")}
                value={kpi.expenses}
                pctChange={kpi.expensesPct}
                sparkline={kpi.expensesSparkline}
                sparkColor="hsl(0, 84%, 60%)"
                icon={TrendingDown}
                accentClass="text-destructive"
              />
              <KpiCard
                title={t("insights.net_profit")}
                value={kpi.netProfit}
                pctChange={kpi.netProfitPct}
                sparkColor={kpi.netProfit >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"}
                icon={Activity}
                accentClass={kpi.netProfit >= 0 ? "text-success" : "text-destructive"}
              />
            </div>
          ) : null
        )}

        {/* ── Main Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="financial-overview" className="gap-1.5">
              <Wallet className="w-4 h-4" />
              {t("bi.tab_financial_overview")}
            </TabsTrigger>
<TabsTrigger value="supplier-perf" className="gap-1.5">
              <Users className="w-4 h-4" />
              {t("analytics.tab_supplier_perf")}
            </TabsTrigger>
            <TabsTrigger value="price-analysis" className="gap-1.5">
              <Search className="w-4 h-4" />
              {t("analytics.tab_price_analysis")}
            </TabsTrigger>
          </TabsList>

          {/* ═══════ Financial Overview Tab ═══════ */}
          <TabsContent value="financial-overview" className="space-y-6">
            {/* Profitability Calendar — first */}
            <ProfitabilityCalendar refreshKey={refreshKey} />

            {/* Revenue vs Expenses Trends */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">{t("finance.monthly_trends")}</h2>
                </div>
                {monthlyTrends.length > 0 && monthlyTrends.some(tr => tr.revenue > 0 || tr.expenses > 0) ? (
                  <>
                    <ChartContainer config={trendConfig} className="aspect-video max-h-[260px]">
                      <AreaChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => fmtShort(v)} className="text-xs" tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="revenue" name={t("dashboard.revenue")} stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" name={t("dashboard.expenses")} stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ChartContainer>
                    <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-success inline-block" /> {t("dashboard.revenue")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> {t("dashboard.expenses")}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">{t("finance.no_trends")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* P&L Summary + Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">{t("finance.pl_month")}</h2>
                  </div>
                  {monthlyPL ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t("dashboard.revenue")}</p>
                        <p className="text-lg font-bold text-success">{fmtCompact(safe(monthlyPL.revenue))}</p>
                        {monthlyPL.revenue_change_pct !== 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${monthlyPL.revenue_change_pct > 0 ? "text-success" : "text-destructive"}`}>
                            {monthlyPL.revenue_change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {monthlyPL.revenue_change_pct > 0 ? "+" : ""}{monthlyPL.revenue_change_pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t("dashboard.expenses")}</p>
                        <p className="text-lg font-bold text-destructive">{fmtCompact(safe(monthlyPL.expenses))}</p>
                        {monthlyPL.expenses_change_pct !== 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${monthlyPL.expenses_change_pct < 0 ? "text-success" : "text-destructive"}`}>
                            {monthlyPL.expenses_change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {monthlyPL.expenses_change_pct > 0 ? "+" : ""}{monthlyPL.expenses_change_pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t("finance.net_profit")}</p>
                        <p className={`text-lg font-bold ${safe(monthlyPL.net_profit) >= 0 ? "text-success" : "text-destructive"}`}>
                          {fmtCompact(safe(monthlyPL.net_profit))}
                        </p>
                        {monthlyPL.profit_change_pct !== 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${monthlyPL.profit_change_pct > 0 ? "text-success" : "text-destructive"}`}>
                            {monthlyPL.profit_change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {monthlyPL.profit_change_pct > 0 ? "+" : ""}{monthlyPL.profit_change_pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">{t("finance.no_pl_data")}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">{t("finance.expense_breakdown")}</h2>
                  </div>
                  {expenseBreakdown.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="w-[160px] h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseBreakdown}
                              dataKey="total"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              innerRadius={35}
                              strokeWidth={2}
                              stroke="hsl(var(--card))"
                            >
                              {expenseBreakdown.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => fmt(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {expenseBreakdown.slice(0, 5).map((cat, i) => (
                          <div key={cat.category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-foreground truncate max-w-[140px] text-xs">{cat.category}</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{cat.percentage.toFixed(0)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <PieChartIcon className="w-10 h-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">{t("finance.no_expense_data")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Suppliers + Invoice Activity */}
            {insightsLoading ? (
              <Skeleton className="h-48 rounded-lg" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-foreground">{t("insights.top_suppliers")}</h2>
                    </div>
                    {topSuppliers.length > 0 ? (
                      <div className="space-y-2.5">
                        {topSuppliers.map((sup, idx) => {
                          const maxTotal = topSuppliers[0]?.total || 1;
                          const barWidth = Math.max(8, (sup.total / maxTotal) * 100);
                          return (
                            <div key={sup.name + idx}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-foreground truncate max-w-[60%]">{sup.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{sup.count} {t("insights.invoices_count")}</span>
                                  <span className="font-semibold text-foreground">{fmtCompact(sup.total)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary/70 transition-all"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">{t("insights.no_suppliers")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-foreground">{t("insights.invoice_activity")}</h2>
                    </div>
                    {invoiceActivity ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                          <p className="text-2xl font-bold text-foreground">{invoiceActivity.receivedThisMonth}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{t("insights.received")}</p>
                          <p className="text-[10px] text-muted-foreground/70">{t("insights.this_month")}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                          <p className="text-2xl font-bold text-success">{invoiceActivity.paidThisMonth}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{t("insights.paid")}</p>
                          <p className="text-[10px] text-muted-foreground/70">{t("insights.this_month")}</p>
                        </div>
                        <div className="rounded-lg bg-destructive/10 p-4 text-center">
                          <p className="text-2xl font-bold text-destructive">{invoiceActivity.overdue}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{t("insights.overdue")}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                          <p className="text-2xl font-bold text-foreground">{invoiceActivity.avgDaysToPay}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{t("insights.avg_days_to_pay")}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="w-10 h-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">{t("finance.no_pl_data")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Profit Margin Overview */}
            {productsLoading ? (
              <Skeleton className="h-72 rounded-lg" />
            ) : marginData ? (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <PieChartIcon className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">{t("bi.profit_margin_overview")}</h2>
                  </div>

                  {/* Average margins */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {marginData.avgDinein > 0 && (
                      <div className="rounded-lg border p-4 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">{t("bi.avg_margin_dinein")}</p>
                        <p className={`text-3xl font-bold ${
                          marginData.avgDinein >= 65 ? "text-success" : marginData.avgDinein >= 45 ? "text-warning" : "text-destructive"
                        }`}>
                          {marginData.avgDinein.toFixed(1)}%
                        </p>
                        <Progress
                          value={Math.min(marginData.avgDinein, 100)}
                          className={`h-2 bg-muted ${
                            marginData.avgDinein >= 65 ? "[&>div]:bg-success" : marginData.avgDinein >= 45 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
                          }`}
                        />
                      </div>
                    )}
                    {marginData.avgDelivery > 0 && (
                      <div className="rounded-lg border p-4 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">{t("bi.avg_margin_delivery")}</p>
                        <p className={`text-3xl font-bold ${
                          marginData.avgDelivery >= 65 ? "text-success" : marginData.avgDelivery >= 45 ? "text-warning" : "text-destructive"
                        }`}>
                          {marginData.avgDelivery.toFixed(1)}%
                        </p>
                        <Progress
                          value={Math.min(marginData.avgDelivery, 100)}
                          className={`h-2 bg-muted ${
                            marginData.avgDelivery >= 65 ? "[&>div]:bg-success" : marginData.avgDelivery >= 45 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Health distribution */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                      <span className="text-muted-foreground">{t("cogs.dash_healthy")}: <span className="font-semibold text-foreground">{marginData.greenCount}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                      <span className="text-muted-foreground">{t("cogs.dash_at_risk")}: <span className="font-semibold text-foreground">{marginData.yellowCount}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" />
                      <span className="text-muted-foreground">{t("cogs.dash_critical")}: <span className="font-semibold text-foreground">{marginData.redCount}</span></span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">{marginData.total} {t("cogs.dash_products_label")}</span>
                  </div>

                  {/* Distribution bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted mb-5">
                    {marginData.greenCount > 0 && (
                      <div className="bg-success transition-all" style={{ width: `${(marginData.greenCount / marginData.total) * 100}%` }} />
                    )}
                    {marginData.yellowCount > 0 && (
                      <div className="bg-warning transition-all" style={{ width: `${(marginData.yellowCount / marginData.total) * 100}%` }} />
                    )}
                    {marginData.redCount > 0 && (
                      <div className="bg-destructive transition-all" style={{ width: `${(marginData.redCount / marginData.total) * 100}%` }} />
                    )}
                  </div>

                  {/* Category breakdown */}
                  {marginData.categories.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("cogs.dash_margin_by_category")}</p>
                      {marginData.categories.map((cat) => (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground truncate max-w-[60%]">{cat.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{cat.count} {t("cogs.dash_products_label")}</span>
                              <span className={`font-bold ${
                                cat.avg >= 65 ? "text-success" : cat.avg >= 45 ? "text-warning" : "text-destructive"
                              }`}>
                                {cat.avg.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={Math.min(cat.avg, 100)}
                            className={`h-1.5 bg-muted ${
                              cat.avg >= 65 ? "[&>div]:bg-success" : cat.avg >= 45 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">{t("bi.profit_margin_overview")}</h2>
                  </div>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PieChartIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">{t("cogs.no_products")}</p>
                  </div>
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {/* ═══════ Supplier Performance Tab ═══════ */}
          <TabsContent value="supplier-perf" className="space-y-6">
            {analyticsLoading ? (
              <Skeleton className="h-64 rounded-lg" />
            ) : (
              <SupplierPerformanceSection data={suppliers} priceData={priceVolatility} />
            )}
          </TabsContent>

          {/* ═══════ Price Analysis Tab ═══════ */}
          <TabsContent value="price-analysis">
            {analyticsLoading ? (
              <Skeleton className="h-64 rounded-lg" />
            ) : (
              <PriceTrendAnalysis priceData={priceVolatility} suppliers={suppliers} />
            )}
          </TabsContent>

        </Tabs>
      </div>

      <AddRevenueModal open={revenueOpen} onOpenChange={setRevenueOpen} onSuccess={onDataChanged} />
      <AddExpenseModal open={expenseOpen} onOpenChange={setExpenseOpen} onSuccess={onDataChanged} />
    </DashboardLayout>
  );
};

export default Finance;
