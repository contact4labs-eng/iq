import type { PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

function getTrend(p: PriceVolatility): "increase" | "decrease" | "stable" {
  const diff = (p.latest_price ?? 0) - (p.avg_price ?? 0);
  const threshold = (p.avg_price ?? 1) * 0.02; // 2% threshold
  if (diff > threshold) return "increase";
  if (diff < -threshold) return "decrease";
  return "stable";
}

function TrendBadge({ trend, t }: { trend: "increase" | "decrease" | "stable"; t: (key: TranslationKey) => string }) {
  if (trend === "increase") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
        <TrendingUp className="w-3 h-3" />
        {t("analytics.trend_increase")}
      </Badge>
    );
  }
  if (trend === "decrease") {
    return (
      <Badge className="bg-success/15 text-success border-success/30 gap-1">
        <TrendingDown className="w-3 h-3" />
        {t("analytics.trend_decrease")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Minus className="w-3 h-3" />
      {t("analytics.trend_stable")}
    </Badge>
  );
}

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
              <TableHead>{t("analytics.col_trend")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_volatility")}</TableHead>
              <TableHead>{t("analytics.col_level")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p, i) => {
              const trend = getTrend(p);
              return (
                <TableRow key={i} className={p.level === "high" ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell>{p.supplier_name}</TableCell>
                  <TableCell className="text-right">{fmt(p.avg_price)}</TableCell>
                  <TableCell className="text-right">{fmt(p.min_price)}</TableCell>
                  <TableCell className="text-right">{fmt(p.max_price)}</TableCell>
                  <TableCell className="text-right">{fmt(p.latest_price)}</TableCell>
                  <TableCell>
                    <TrendBadge trend={trend} t={t} />
                  </TableCell>
                  <TableCell className="text-right">{(p.volatility ?? 0).toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge className={levelColors[p.level] ?? "bg-muted text-muted-foreground"}>
                      {levelLabelKeys[p.level] ? t(levelLabelKeys[p.level]) : p.level}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
