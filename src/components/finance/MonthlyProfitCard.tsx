import type { MonthlyKpis } from "@/hooks/useFinanceData";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function GrowthArrow({ rate, label }: { rate: number | undefined | null; label: string }) {
  const val = rate ?? 0;
  const isUp = val >= 0;
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {isUp ? (
        <span className="inline-flex items-center gap-0.5 text-success">
          <TrendingUp className="w-3.5 h-3.5" /> +{val.toFixed(1)}%
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 text-destructive">
          <TrendingDown className="w-3.5 h-3.5" /> {val.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function MonthlyProfitCard({ data }: { data: MonthlyKpis | null }) {
  if (!data) return null;

  const profitColor = data.net_profit >= 0 ? "text-success" : "text-destructive";

  return (
    <Card className="bg-primary text-primary-foreground">
      <CardContent className="p-6 space-y-4">
        <p className="text-sm opacity-80">Κέρδος Μήνα</p>
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold font-display ${data.net_profit >= 0 ? "" : "text-destructive-foreground"}`}>
            {fmt(data.net_profit)}
          </span>
          <span className="text-lg opacity-80">({(data.margin_pct ?? 0).toFixed(1)}% margin)</span>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary-foreground/20">
          <div>
            <p className="text-xs opacity-70">Έσοδα</p>
            <p className="text-lg font-semibold">{fmt(data.revenue_total)}</p>
            <GrowthArrow rate={data.revenue_growth_rate} label="" />
          </div>
          <div>
            <p className="text-xs opacity-70">Έξοδα</p>
            <p className="text-lg font-semibold">{fmt(data.expenses_total)}</p>
            <GrowthArrow rate={data.expense_growth_rate} label="" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
