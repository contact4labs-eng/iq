import { useState } from "react";
import { Wallet, Plus, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, BarChart3, PiggyBank, Receipt, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useFinanceData } from "@/hooks/useFinanceData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddRevenueModal } from "@/components/finance/AddRevenueModal";
import { AddExpenseModal } from "@/components/finance/AddExpenseModal";
import { CashRegisterModal } from "@/components/finance/CashRegisterModal";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const safe = (v: any): number => (v == null || isNaN(v)) ? 0 : Number(v);

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtDetailed(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function PctBadge({ pct }: { pct: number }) {
  if (pct > 0) return <Badge className="bg-success/15 text-success border-0 gap-0.5 font-medium"><TrendingUp className="w-3 h-3" />+{pct.toFixed(1)}%</Badge>;
  if (pct < 0) return <Badge className="bg-destructive/15 text-destructive border-0 gap-0.5 font-medium"><TrendingDown className="w-3 h-3" />{pct.toFixed(1)}%</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-0 gap-0.5"><Minus className="w-3 h-3" />0%</Badge>;
}

const chartConfig: ChartConfig = {
  revenue: { label: "Έσοδα", color: "hsl(var(--success))" },
  expenses: { label: "Έξοδα", color: "hsl(var(--destructive))" },
  net_flow: { label: "Καθαρή Ροή", color: "hsl(var(--accent))" },
};

const pressureLabels: Record<string, string> = { CRITICAL: "Κρίσιμο", HIGH: "Υψηλό", MEDIUM: "Μεσαίο", LOW: "Χαμηλό" };
const pressureColors: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-warning text-warning-foreground",
  MEDIUM: "bg-accent/20 text-accent",
  LOW: "bg-success/15 text-success",
};

const Finance = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { monthly, daily, weekly, cashFlow, expenseBreakdown, profitPressure, loading, error } = useFinanceData(refreshKey);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);

  const onDataChanged = () => setRefreshKey((k) => k + 1);

  const mRevenue = safe(monthly?.revenue_total);
  const mExpenses = safe(monthly?.expenses_total);
  const mProfit = safe(monthly?.net_profit);
  const mMargin = safe(monthly?.margin_pct);
  const mRevGrowth = safe(monthly?.revenue_growth_rate);
  const mExpGrowth = safe(monthly?.expense_growth_rate);

  const dCash = safe(daily?.cash_position);
  const dPending = safe(daily?.pending_outgoing);
  const dOverdue = safe(daily?.overdue_amount);
  const dTodayRev = safe(daily?.today_revenue);
  const dTodayExp = safe(daily?.today_expenses);
  const dTodayProfit = safe(daily?.today_profit);

  const wThisRev = safe(weekly?.this_week_revenue);
  const wThisExp = safe(weekly?.this_week_expenses);
  const wThisProfit = safe(weekly?.this_week_profit);
  const wRevPct = safe(weekly?.revenue_change_pct);
  const wExpPct = safe(weekly?.expenses_change_pct);
  const wProfitPct = safe(weekly?.profit_change_pct);

  const ppLevel = profitPressure?.pressure_level?.toUpperCase() ?? "";
  const ppCurrent = safe(profitPressure?.current_margin);
  const ppPrevious = safe(profitPressure?.previous_margin);

  const maxExpense = expenseBreakdown.length > 0 ? Math.max(...expenseBreakdown.map((d) => safe(d.total))) : 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <Wallet className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold font-display text-foreground">Χρήματα</h1>
            </div>
            <p className="text-sm text-muted-foreground">Οικονομική επισκόπηση της επιχείρησής σας</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => setRevenueOpen(true)}>
              <ArrowUpRight className="w-4 h-4" /> Έσοδο
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
              <ArrowDownRight className="w-4 h-4" /> Έξοδο
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setCashOpen(true)}>
              <PiggyBank className="w-4 h-4" /> Ταμείο
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
            <Skeleton className="h-64 rounded-lg" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          </div>
        ) : (
          <>
            {/* ─── Hero KPI Strip ─── */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {/* Monthly Profit */}
              <Card className="bg-primary text-primary-foreground col-span-2 lg:col-span-1">
                <CardContent className="p-5">
                  <p className="text-xs opacity-70 mb-1">Κέρδος Μήνα</p>
                  <p className="text-3xl font-bold font-display">{fmt(mProfit)}</p>
                  <p className="text-xs opacity-60 mt-1">{mMargin.toFixed(1)}% margin</p>
                </CardContent>
              </Card>

              {/* Revenue */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Έσοδα</p>
                    <PctBadge pct={mRevGrowth} />
                  </div>
                  <p className="text-2xl font-bold font-display text-foreground">{fmt(mRevenue)}</p>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Έξοδα</p>
                    <PctBadge pct={mExpGrowth} />
                  </div>
                  <p className="text-2xl font-bold font-display text-foreground">{fmt(mExpenses)}</p>
                </CardContent>
              </Card>

              {/* Cash Position */}
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Ταμείο</p>
                  <p className="text-2xl font-bold font-display text-foreground">{fmt(dCash)}</p>
                  {dOverdue > 0 && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {fmt(dOverdue)} ληξιπρόθεσμα
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── Today Strip ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Σήμερα</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Έσοδα</p>
                    <p className="text-lg font-bold text-foreground">{fmtDetailed(dTodayRev)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Έξοδα</p>
                    <p className="text-lg font-bold text-foreground">{fmtDetailed(dTodayExp)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Κέρδος</p>
                    <p className={`text-lg font-bold ${dTodayProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      {fmtDetailed(dTodayProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── Two-Column: Weekly + Pressure ─── */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Weekly */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">Εβδομάδα</h2>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Έσοδα", value: wThisRev, pct: wRevPct },
                      { label: "Έξοδα", value: wThisExp, pct: wExpPct },
                      { label: "Κέρδος", value: wThisProfit, pct: wProfitPct },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{r.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">{fmt(r.value)}</span>
                          <PctBadge pct={r.pct} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Profit Pressure */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">Πίεση Κερδοφορίας</h2>
                    {ppLevel && (
                      <Badge className={pressureColors[ppLevel] ?? "bg-muted text-muted-foreground"}>
                        {pressureLabels[ppLevel] ?? ppLevel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Τώρα: </span>
                      <span className="font-semibold text-foreground">{ppCurrent.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Πριν: </span>
                      <span className="font-semibold text-foreground">{ppPrevious.toFixed(1)}%</span>
                    </div>
                  </div>
                  {profitPressure?.top_sources && profitPressure.top_sources.length > 0 && (
                    <div className="space-y-1.5 border-t border-border pt-3">
                      {profitPressure.top_sources.map((s, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{s.source}</span>
                          <span className="text-destructive font-medium">{safe(s.impact).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── Cash Flow Chart ─── */}
            {cashFlow.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Ταμειακή Ροή (6 μήνες)</h2>
                  <ChartContainer config={chartConfig} className="aspect-video max-h-[280px]">
                    <AreaChart data={cashFlow}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis tickFormatter={(v) => fmt(v)} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" fill="url(#gradRevenue)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="url(#gradExpenses)" strokeWidth={2} />
                      <Area type="monotone" dataKey="net_flow" stroke="hsl(var(--accent))" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ChartContainer>
                  <div className="flex items-center justify-center gap-5 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-success inline-block" /> Έσοδα</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-destructive inline-block" /> Έξοδα</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-accent inline-block" style={{ borderTop: "1px dashed" }} /> Καθαρή Ροή</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Expense Breakdown ─── */}
            {expenseBreakdown.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Έξοδα ανά κατηγορία</h2>
                  <div className="space-y-2.5">
                    {expenseBreakdown.map((item) => (
                      <div key={item.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground">{item.category}</span>
                          <span className="text-muted-foreground">{fmtDetailed(safe(item.total))} · {safe(item.percentage).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${(safe(item.total) / maxExpense) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Pending / Overdue strip ─── */}
            {(dPending > 0 || dOverdue > 0) && (
              <div className="grid gap-3 grid-cols-2">
                {dPending > 0 && (
                  <Card>
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Εκκρεμείς πληρωμές</p>
                        <p className="text-lg font-bold text-foreground">{fmt(dPending)}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {dOverdue > 0 && (
                  <Card>
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ληξιπρόθεσμα</p>
                        <p className="text-lg font-bold text-destructive">{fmt(dOverdue)}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AddRevenueModal open={revenueOpen} onOpenChange={setRevenueOpen} onSuccess={onDataChanged} />
      <AddExpenseModal open={expenseOpen} onOpenChange={setExpenseOpen} onSuccess={onDataChanged} />
      <CashRegisterModal open={cashOpen} onOpenChange={setCashOpen} onSuccess={onDataChanged} />
    </DashboardLayout>
  );
};

export default Finance;
