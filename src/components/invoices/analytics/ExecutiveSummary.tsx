import type { ExecutiveSummary } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Users, TrendingUp, CalendarDays, Receipt } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

function formatCurrency(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

const statDefs: { key: keyof ExecutiveSummary; labelKey: TranslationKey; icon: typeof FileText; fmt: (v: number) => string }[] = [
  { key: "total_invoices", labelKey: "analytics.total_invoices", icon: FileText, fmt: (v) => String(v) },
  { key: "total_spend", labelKey: "analytics.total_spend", icon: DollarSign, fmt: formatCurrency },
  { key: "avg_invoice", labelKey: "analytics.avg_invoice", icon: TrendingUp, fmt: formatCurrency },
  { key: "unique_suppliers", labelKey: "analytics.suppliers", icon: Users, fmt: (v) => String(v) },
  { key: "invoices_this_month", labelKey: "analytics.invoices_month", icon: CalendarDays, fmt: (v) => String(v) },
  { key: "spend_this_month", labelKey: "analytics.spend_month", icon: Receipt, fmt: formatCurrency },
];

export function ExecutiveSummarySection({ data }: { data: ExecutiveSummary | null }) {
  const { t } = useLanguage();
  if (!data) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">{t("analytics.summary")}</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {statDefs.map(({ key, labelKey, icon: Icon, fmt }) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
              </div>
              <p className="text-xl font-bold font-display text-foreground">{fmt(data[key] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
