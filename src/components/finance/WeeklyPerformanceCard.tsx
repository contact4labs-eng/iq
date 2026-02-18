import type { WeeklyKpis } from "@/hooks/useFinanceData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function Change({ pct }: { pct: number | undefined | null }) {
  const val = pct ?? 0;
  if (val > 0)
    return <span className="inline-flex items-center gap-0.5 text-xs text-success"><TrendingUp className="w-3 h-3" /> +{val.toFixed(1)}%</span>;
  if (val < 0)
    return <span className="inline-flex items-center gap-0.5 text-xs text-destructive"><TrendingDown className="w-3 h-3" /> {val.toFixed(1)}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> 0%</span>;
}

export function WeeklyPerformanceCard({ data }: { data: WeeklyKpis | null }) {
  if (!data) return null;

  const rows = [
    { label: "Έσοδα", thisWeek: data.this_week_revenue, lastWeek: data.last_week_revenue, pct: data.revenue_change_pct },
    { label: "Έξοδα", thisWeek: data.this_week_expenses, lastWeek: data.last_week_expenses, pct: data.expenses_change_pct },
    { label: "Κέρδος", thisWeek: data.this_week_profit, lastWeek: data.last_week_profit, pct: data.profit_change_pct },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Εβδομαδιαία Απόδοση</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-20">{r.label}</span>
              <span className="text-sm font-medium text-foreground">{fmt(r.thisWeek)}</span>
              <span className="text-xs text-muted-foreground">vs {fmt(r.lastWeek)}</span>
              <Change pct={r.pct} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
