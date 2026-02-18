import type { SupplierPerformance } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

function formatCurrency(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

const riskColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const riskLabelKeys: Record<string, TranslationKey> = {
  high: "analytics.risk_high",
  medium: "analytics.risk_medium",
  low: "analytics.risk_low",
};

export function SupplierPerformanceSection({ data }: { data: SupplierPerformance[] }) {
  const { t } = useLanguage();
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("analytics.supplier_perf")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("analytics.col_supplier")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_total_spend")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_invoices")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_avg_invoice")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_dependency")}</TableHead>
              <TableHead>{t("analytics.col_risk")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{s.supplier_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(s.total_spend)}</TableCell>
                <TableCell className="text-right">{s.invoice_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(s.avg_invoice)}</TableCell>
                <TableCell className="text-right">{(s.dependency_pct ?? 0).toFixed(1)}%</TableCell>
                <TableCell>
                  <Badge className={riskColors[s.risk_level] ?? "bg-muted text-muted-foreground"}>
                    {riskLabelKeys[s.risk_level] ? t(riskLabelKeys[s.risk_level]) : s.risk_level}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
