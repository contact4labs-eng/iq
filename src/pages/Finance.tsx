import { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, AlertTriangle, Plus, PiggyBank, BarChart3, CalendarClock, TrendingUp, TrendingDown, PieChart as PieChartIcon, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useFinanceDashboard } from "@/hooks/useFinanceDashboard";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { useFinanceExtras } from "@/hooks/useFinanceExtras";
import { ProfitabilityCalendar } from "@/components/finance/ProfitabilityCalendar";

const safe = (v: any): number => (v == null || isNaN(v)) ? 0 : Number(v);

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function fmtShort(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const chartConfig: ChartConfig = {
  inflows: { label: "Εισροές", color: "hsl(var(--success))" },
  outflows: { label: "Εκροές", color: "hsl(var(--destructive))" },
};

const trendConfig: ChartConfig = {
  revenue: { label: "Έσοδα", color: "hsl(var(--success))" },
  expenses: { label: "Έξοδα", color: "hsl(var(--destructive))" },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const Finance = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { cashPosition, receivables, payables, weeklyCashFlow, overdueInvoices, upcomingPayments, loading, error } = useFinanceDashboard(refreshKey);
  const { monthlyPL, expenseBreakdown, monthlyTrends } = useFinanceExtras(refreshKey);

  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);

  const onDataChanged = () => setRefreshKey((k) => k + 1);

  const totalCash = safe(cashPosition?.total_cash);
  const cashOnHand = safe(cashPosition?.cash_on_hand);
  const bankBalance = safe(cashPosition?.bank_balance);
  const cashChangePct = safe(cashPosition?.change_pct);
  const recvTotal = safe(receivables?.total);
  const recvCount = safe(receivables?.count);
  const payTotal = safe(payables?.total);
  const payCount = safe(payables?.count);

  const hasChartData = weeklyCashFlow.some((w) => w.inflows > 0 || w.outflows > 0);

  // Transform data for grouped bar chart
  const chartData = weeklyCashFlow.map((w) => ({
    week: w.week,
    inflows: safe(w.inflows),
    outflows: safe(w.outflows),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Header + Quick Actions ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <Wallet className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold font-display text-foreground">Χρήματα</h1>
            </div>
            <p className="text-sm text-muted-foreground">Οικονομική επισκόπηση και ταμειακές ροές</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => setRevenueOpen(true)}>
              <Plus className="w-4 h-4" /> Έσοδο
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
              <Plus className="w-4 h-4" /> Έξοδο
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
            <Skeleton className="h-36 rounded-lg" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : (
          <>
            {/* ─── 1. Ταμειακό Υπόλοιπο ─── */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 opacity-70" />
                    <h2 className="text-sm font-semibold opacity-80">Ταμειακό Υπόλοιπο</h2>
                  </div>
                  {cashChangePct !== 0 && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cashChangePct > 0 ? "bg-success/20 text-success-foreground" : "bg-destructive/20 text-destructive-foreground"}`}>
                      {cashChangePct > 0 ? "+" : ""}{cashChangePct.toFixed(1)}% vs προηγ. μήνα
                    </span>
                  )}
                </div>
                <p className="text-4xl font-bold font-display tracking-tight">
                  {fmt(totalCash)}
                </p>
                <div className="flex gap-6 mt-4 pt-3 border-t border-primary-foreground/20">
                  <div>
                    <p className="text-xs opacity-60">Μετρητά</p>
                    <p className="text-lg font-semibold">{fmtShort(cashOnHand)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60">Τράπεζα</p>
                    <p className="text-lg font-semibold">{fmtShort(bankBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── 2 & 3. Εισπρακτέα + Πληρωτέα ─── */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Receivables */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center">
                      <ArrowDownLeft className="w-4.5 h-4.5 text-success" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Εισπρακτέα</h2>
                      <p className="text-xs text-muted-foreground">Εγκεκριμένα τιμολόγια προς είσπραξη</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold font-display text-success">{fmt(recvTotal)}</p>
                  {recvCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{recvCount} τιμολόγι{recvCount === 1 ? "ο" : "α"}</p>
                  )}
                </CardContent>
              </Card>

              {/* Payables */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center">
                      <ArrowUpRight className="w-4.5 h-4.5 text-warning" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Πληρωτέα</h2>
                      <p className="text-xs text-muted-foreground">Προγραμματισμένες πληρωμές σε αναμονή</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold font-display text-warning">{fmt(payTotal)}</p>
                  {payCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{payCount} πληρωμ{payCount === 1 ? "ή" : "ές"}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── 4. Ταμειακή Ροή 30 Ημερών ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Ταμειακή Ροή 30 Ημερών</h2>
                </div>

                {hasChartData ? (
                  <>
                    <ChartContainer config={chartConfig} className="aspect-video max-h-[260px]">
                      <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="week" className="text-xs" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => fmtShort(v)} className="text-xs" tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="inflows" name="Εισροές" radius={[4, 4, 0, 0]} fill="hsl(var(--success))" />
                        <Bar dataKey="outflows" name="Εκροές" radius={[4, 4, 0, 0]} fill="hsl(var(--destructive))" />
                      </BarChart>
                    </ChartContainer>
                    <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-success inline-block" /> Εισροές
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> Εκροές
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα ταμειακής ροής</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── 5. Προγραμματισμένες Πληρωμές ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">Προγραμματισμένες Πληρωμές</h2>
                  </div>
                  {upcomingPayments.length > 0 && (
                    <Badge className="bg-accent/15 text-accent border-0">
                      {upcomingPayments.length}
                    </Badge>
                  )}
                </div>

                {upcomingPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Περιγραφή</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Ποσό</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Ημερομηνία</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Σε</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingPayments.map((p) => (
                          <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[200px]">{p.description}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">{fmt(safe(p.amount))}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{p.due_date}</td>
                            <td className="py-2.5 px-3 text-right">
                              <Badge className="bg-accent/10 text-accent border-0 font-medium">
                                {safe(p.days_until)} ημέρ{safe(p.days_until) === 1 ? "α" : "ες"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarClock className="w-10 h-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Δεν υπάρχουν προγραμματισμένες πληρωμές</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── 6. Ληξιπρόθεσμα Τιμολόγια ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h2 className="text-sm font-semibold text-foreground">Ληξιπρόθεσμα Τιμολόγια</h2>
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
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Προμηθευτής</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Αρ. Τιμολογίου</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Ποσό</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Ημέρες Καθυστέρησης</th>
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
                                  {safe(inv.days_overdue)} ημέρ{safe(inv.days_overdue) === 1 ? "α" : "ες"}
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
                    <p className="text-sm text-muted-foreground">Δεν υπάρχουν ληξιπρόθεσμα τιμολόγια</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── 7. Ημερολόγιο Κερδοφορίας ─── */}
            <ProfitabilityCalendar refreshKey={refreshKey} />

            {/* ─── 8. Κέρδος & Ζημία Μήνα (P&L) ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Κέρδος & Ζημία Μήνα</h2>
                </div>
                {monthlyPL ? (
                  <div className="grid grid-cols-3 gap-4">
                    {/* Έσοδα */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Έσοδα</p>
                      <p className="text-xl font-bold text-success">{fmt(safe(monthlyPL.revenue))}</p>
                      {monthlyPL.revenue_change_pct !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${monthlyPL.revenue_change_pct > 0 ? "text-success" : "text-destructive"}`}>
                          {monthlyPL.revenue_change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {monthlyPL.revenue_change_pct > 0 ? "+" : ""}{monthlyPL.revenue_change_pct.toFixed(1)}% vs προηγ. μήνα
                        </span>
                      )}
                    </div>
                    {/* Έξοδα */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Έξοδα</p>
                      <p className="text-xl font-bold text-destructive">{fmt(safe(monthlyPL.expenses))}</p>
                      {monthlyPL.expenses_change_pct !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${monthlyPL.expenses_change_pct < 0 ? "text-success" : "text-destructive"}`}>
                          {monthlyPL.expenses_change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {monthlyPL.expenses_change_pct > 0 ? "+" : ""}{monthlyPL.expenses_change_pct.toFixed(1)}% vs προηγ. μήνα
                        </span>
                      )}
                    </div>
                    {/* Καθαρό Κέρδος */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Καθαρό Κέρδος</p>
                      <p className={`text-xl font-bold ${safe(monthlyPL.net_profit) >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmt(safe(monthlyPL.net_profit))}
                      </p>
                      {monthlyPL.profit_change_pct !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${monthlyPL.profit_change_pct > 0 ? "text-success" : "text-destructive"}`}>
                          {monthlyPL.profit_change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {monthlyPL.profit_change_pct > 0 ? "+" : ""}{monthlyPL.profit_change_pct.toFixed(1)}% vs προηγ. μήνα
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Δεν υπάρχουν δεδομένα</p>
                )}
              </CardContent>
            </Card>

            {/* ─── 8. Ανάλυση Εξόδων (Pie Chart) ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Κατανομή Εξόδων</h2>
                </div>
                {expenseBreakdown.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-[200px] h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseBreakdown}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
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
                    <div className="flex-1 space-y-2">
                      {expenseBreakdown.slice(0, 6).map((cat, i) => (
                        <div key={cat.category} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-foreground truncate max-w-[180px]">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">{fmt(cat.total)}</span>
                            <Badge variant="secondary" className="text-xs">{cat.percentage.toFixed(0)}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <PieChartIcon className="w-10 h-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα εξόδων</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── 9. Τάσεις 6 Μηνών (Area Chart) ─── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Τάσεις 6 Μηνών</h2>
                </div>
                {monthlyTrends.length > 0 && monthlyTrends.some(t => t.revenue > 0 || t.expenses > 0) ? (
                  <>
                    <ChartContainer config={trendConfig} className="aspect-video max-h-[260px]">
                      <AreaChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => fmtShort(v)} className="text-xs" tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="revenue" name="Έσοδα" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" name="Έξοδα" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ChartContainer>
                    <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-success inline-block" /> Έσοδα
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> Έξοδα
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Δεν υπάρχουν αρκετά δεδομένα για τάσεις</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
