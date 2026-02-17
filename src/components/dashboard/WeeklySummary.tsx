import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WeeklyKpis {
  revenue: number;
  expenses: number;
  profit: number;
  prev_revenue?: number;
  prev_expenses?: number;
  prev_profit?: number;
}

interface WeeklySummaryProps {
  data: WeeklyKpis | null;
  loading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function ComparisonArrow({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined || previous === null) return null;
  const diff = current - previous;
  if (diff > 0)
    return <TrendingUp className="w-4 h-4 text-success inline ml-1" />;
  if (diff < 0)
    return <TrendingDown className="w-4 h-4 text-destructive inline ml-1" />;
  return null;
}

export function WeeklySummary({ data, loading }: WeeklySummaryProps) {
  const rows = data
    ? [
        { label: "Έσοδα", value: data.revenue, prev: data.prev_revenue },
        { label: "Έξοδα", value: data.expenses, prev: data.prev_expenses },
        { label: "Κέρδος", value: data.profit, prev: data.prev_profit },
      ]
    : [];

  return (
    <div className="bg-card border rounded-lg p-5 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-4">Εβδομαδιαία σύνοψη</h3>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(row.value)}
                <ComparisonArrow current={row.value} previous={row.prev} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</p>
      )}
    </div>
  );
}
