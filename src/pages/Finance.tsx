import { useState, useMemo } from "react";
import {
  Wallet, Clock, AlertTriangle, Plus, BarChart3, TrendingUp, TrendingDown,
  PieChart as PieChartIcon, Activity, Users, FileText, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useFinanceDashboard } from "@/hooks/useFinanceDashboard";
import { useBusinessInsights } from "@/hooks/useBusinessInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddRevenueModal } from "@/components/finance/AddRevenueModal";
import { AddExpenseModal } from "@/components/finance/AddExpenseModal";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie,
  AreaChart, Area, LineChart, Line, Tooltip, ResponsiveContainer,
} from "recharts";
import { useFinanceExtras } from "@/hooks/useFinanceExtras";
import { ProfitabilityCalendar } from "@/components/finance/ProfitabilityCalendar";
import { useLanguage } from "@/contexts/LanguageContext";

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

/* ── KPI Card ─────────────────────────────────────────────── */
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
  const { weeklyCashFlow, overdueInvoices, loading, error } = useFinanceDashboard(refreshKey);
  const { kpi, topSuppliers, invoiceActivity, loading: insightsLoading } = useBusinessInsights(refreshKey);
  const { monthlyPL, expenseBreakdown, monthlyTrends } = useFinanceExtras(refreshKey);
  const { t } = useLanguage();

  const chartConfig: ChartConfig = {
    inflows: { label: t("finance.inflows"), color: "hsl(var(--success))" },
    outflows: { label: t("finance.outflows"), color: "hsl(var(--destructive))" },
  };

  const trendConfig: ChartConfig = {
    revenue: { label: t("dashboard.revenue"), color: "hsl(var(--success))" },
    expenses: { label: t("dashboard.expenses"), color: "hsl(var(--destructive))" },
  };

  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const onDataChanged = () => setRefreshKey((k) => k + 1);

  const hasChartData = useMemo(
    () => weeklyCashFlow.some((w) => w.inflows > 0 || w.outflows > 0),
    [weeklyCashFlow]
  );

  const chartData = useMemo(
    () => weeklyCashFlow.map((w) => ({
      week: w.week,
      inflows: safe(w.inflows),
      outflows: safe(w.outflows),
    })),
    [weeklyCashFlow]
  );

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
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => setRevenueOpen(true)}>
              <Plus className="w-4 h-4" /> {t("finance.add_revenue")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
              <Plus className="w-4 h-4" /> {t("finance.add_expense")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── Row 1: KPI Cards with Sparklines ── */}
        {insightsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : kpi ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <KpiCard
              title={t("insights.outstanding")}
              value={kpi.netExposure}
              sparkColor="hsl(221, 83%, 53%)"
              icon={Wallet}
              accentClass="text-primary"
            />
          </div>
        ) : null}

        {/* Outstanding Balance breakdown row */}
        {kpi && (kpi.outstandingReceivables > 0 || kpi.outstandingPayables > 0) && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground mb-0.5">{t("insights.receivables")}</p>
                <p className="text-lg font-bold text-success">{fmtCompact(kpi.outstandingReceivables)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground mb-0.5">{t("insights.payables")}</p>
                <p className="text-lg font-bold text-destructive">{fmtCompact(kpi.outstandingPayables)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground mb-0.5">{t("insights.net_exposure")}</p>
                <p className={`text-lg font-bold ${kpi.netExposure >= 0 ? "text-success" : "text-destructive"}`}>
                  {fmtCompact(kpi.netExposure)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Row 2: Revenue vs Expenses Trends (6 months) ── */}
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

        {/* ── Row 3: P&L Summary (left) + Expense Breakdown Pie (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P&L Monthly */}
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

          {/* Expense Breakdown (Pie Chart) */}
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

        {/* ── Row 4: Top Suppliers (left) + Invoice Activity (right) ── */}
        {insightsLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Suppliers */}
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

            {/* Invoice Activity */}
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

        {/* ── Row 5: Cash Flow 30 Days ── */}
        {loading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">{t("finance.cash_flow_30d")}</h2>
              </div>
              {hasChartData ? (
                <>
                  <ChartContainer config={chartConfig} className="aspect-video max-h-[260px]">
                    <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="week" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => fmtShort(v)} className="text-xs" tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="inflows" name={t("finance.inflows")} radius={[4, 4, 0, 0]} fill="hsl(var(--success))" />
                      <Bar dataKey="outflows" name={t("finance.outflows")} radius={[4, 4, 0, 0]} fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-success inline-block" /> {t("finance.inflows")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> {t("finance.outflows")}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{t("finance.no_cash_flow")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Row 6: Overdue Invoices ── */}
        {loading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h2 className="text-sm font-semibold text-foreground">{t("finance.overdue_invoices")}</h2>
                </div>
                {overdueInvoices.length > 0 && (
                  <Badge className="bg-destructive/15 text-destructive border-0">
                    {overdueInvoices.length}
                  </Badge>
                )}
              </div>
              {overdueInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">{t("finance.supplier")}</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">{t("finance.invoice_number")}</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">{t("finance.amount")}</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">{t("finance.days_overdue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[200px]">{inv.supplier_name}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{inv.invoice_number}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-destructive">{fmt(safe(inv.total_amount))}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3 text-destructive/70" />
                              <span className="text-destructive/80 font-medium">
                                {safe(inv.days_overdue)} {safe(inv.days_overdue) === 1 ? t("finance.day") : t("finance.days")}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("finance.no_overdue")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Row 7: Profitability Calendar ── */}
        <ProfitabilityCalendar refreshKey={refreshKey} />
      </div>

      <AddRevenueModal open={revenueOpen} onOpenChange={setRevenueOpen} onSuccess={onDataChanged} />
      <AddExpenseModal open={expenseOpen} onOpenChange={setExpenseOpen} onSuccess={onDataChanged} />
    </DashboardLayout>
  );
};

export default Finance;
