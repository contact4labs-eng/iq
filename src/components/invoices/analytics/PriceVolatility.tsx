import type { PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

const levelColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const levelLabelKeys: Record<string, TranslationKey> = {
  high: "analytics.level_high",
  medium: "analytics.level_medium",
  low: "analytics.level_low",
};

export function PriceVolatilitySection({ data }: { data: PriceVolatility[] }) {
  const { t } = useLanguage();
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("analytics.price_volatility")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("analytics.col_product")}</TableHead>
              <TableHead>{t("analytics.col_supplier")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_avg_price")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_min")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_max")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_latest")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_volatility")}</TableHead>
              <TableHead>{t("analytics.col_level")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p, i) => (
              <TableRow key={i} className={p.level === "high" ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{p.product_name}</TableCell>
                <TableCell>{p.supplier_name}</TableCell>
                <TableCell className="text-right">{fmt(p.avg_price)}</TableCell>
                <TableCell className="text-right">{fmt(p.min_price)}</TableCell>
                <TableCell className="text-right">{fmt(p.max_price)}</TableCell>
                <TableCell className="text-right">{fmt(p.latest_price)}</TableCell>
                <TableCell className="text-right">{(p.volatility ?? 0).toFixed(1)}%</TableCell>
                <TableCell>
                  <Badge className={levelColors[p.level] ?? "bg-muted text-muted-foreground"}>
                    {levelLabelKeys[p.level] ? t(levelLabelKeys[p.level]) : p.level}
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
