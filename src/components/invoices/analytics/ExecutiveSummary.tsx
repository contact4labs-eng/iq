import type { ExecutiveSummary } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Users, TrendingUp, CalendarDays, Receipt } from "lucide-react";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

const stats = [
  { key: "total_invoices" as const, label: "Σύνολο τιμολογίων", icon: FileText, fmt: (v: number) => String(v) },
  { key: "total_spend" as const, label: "Συνολική δαπάνη", icon: DollarSign, fmt: formatCurrency },
  { key: "avg_invoice" as const, label: "Μέσο τιμολόγιο", icon: TrendingUp, fmt: formatCurrency },
  { key: "unique_suppliers" as const, label: "Προμηθευτές", icon: Users, fmt: (v: number) => String(v) },
  { key: "invoices_this_month" as const, label: "Τιμολόγια μήνα", icon: CalendarDays, fmt: (v: number) => String(v) },
  { key: "spend_this_month" as const, label: "Δαπάνη μήνα", icon: Receipt, fmt: formatCurrency },
];

export function ExecutiveSummarySection({ data }: { data: ExecutiveSummary | null }) {
  if (!data) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Συνοπτικά</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ key, label, icon: Icon, fmt }) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-xl font-bold font-display text-foreground">{fmt(data[key] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
