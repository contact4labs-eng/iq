import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
  label: string;
  value: number | null;
  trend?: number;
  loading: boolean;
  isNegativeHighlight?: boolean;
}

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function TrendIcon({ trend }: { trend?: number | null }) {
  if (trend === undefined || trend === null) return null;
  const val = trend ?? 0;
  if (val > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-success">
        <TrendingUp className="w-3.5 h-3.5" />
        +{val.toFixed(1)}%
      </span>
    );
  if (val < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-destructive">
        <TrendingDown className="w-3.5 h-3.5" />
        {val.toFixed(1)}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="w-3.5 h-3.5" />
      0%
    </span>
  );
}

export function KpiCard({ label, value, trend, loading, isNegativeHighlight }: KpiCardProps) {
  const isNegative = isNegativeHighlight && value !== null && value > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-32 mt-1" />
      ) : (
        <div className="flex items-end justify-between">
          <span
            className={`text-2xl font-bold font-display ${
              isNegative ? "text-destructive" : "text-foreground"
            }`}
          >
            {value !== null ? formatCurrency(value) : "—"}
          </span>
          <TrendIcon trend={trend} />
        </div>
      )}
    </div>
  );
}
