import { useMemo } from "react";
import type { ExecutiveSummary, CostAnalytics } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Users, TrendingUp, TrendingDown, CalendarDays, Receipt, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

function formatCurrency(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

function TrendBadge({ value }: { value: number | null }) {
  if (value == null || value === 0) return null;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      isUp ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
    }`}>
      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isUp ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

const statDefs: { key: keyof ExecutiveSummary; labelKey: TranslationKey; icon: typeof FileText; fmt: (v: number) => string }[] = [
  { key: "total_invoices", labelKey: "analytics.total_invoices", icon: FileText, fmt: (v) => String(v) },
  { key: "total_spend", labelKey: "analytics.total_spend", icon: DollarSign, fmt: formatCurrency },
  { key: "avg_invoice", labelKey: "analytics.avg_invoice", icon: TrendingUp, fmt: formatCurrency },
  { key: "unique_suppliers", labelKey: "analytics.suppliers", icon: Users, fmt: (v) => String(v) },
  { key: "invoices_this_month", labelKey: "analytics.invoices_month", icon: CalendarDays, fmt: (v) => String(v) },
  { key: "spend_this_month", labelKey: "analytics.spend_month", icon: Receipt, fmt: formatCurrency },
];

interface Props {
  data: ExecutiveSummary | null;
  costAnalytics?: CostAnalytics | null;
}

export function ExecutiveSummarySection({ data, costAnalytics }: Props) {
  const { t } = useLanguage();

  // Compute month-over-month spend trend from monthly_trends
  const spendTrend = useMemo(() => {
    if (!costAnalytics?.monthly_trends || costAnalytics.monthly_trends.length < 2) return null;
    const sorted = [...costAnalytics.monthly_trends].sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
    );
    const current = sorted[sorted.length - 1]?.total ?? 0;
    const previous = sorted[sorted.length - 2]?.total ?? 0;
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }, [costAnalytics]);

  if (!data) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">{t("analytics.summary")}</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {statDefs.map(({ key, labelKey, icon: Icon, fmt }) => {
          // Show spend trend on total_spend and spend_this_month
          const showTrend = (key === "total_spend" || key === "spend_this_month") && spendTrend != null;
          return (
            <Card key={key} className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold font-display text-foreground">{fmt(data[key] ?? 0)}</p>
                  {showTrend && <TrendBadge value={spendTrend} />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
