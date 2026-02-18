import { useMemo } from "react";
import type { SupplierPerformance, PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, ResponsiveContainer } from "recharts";
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

function calcReliability(s: SupplierPerformance): number {
  let score = 0;
  if (s.risk_level === "low") score += 40;
  else if (s.risk_level === "medium") score += 20;
  const dep = Math.min(s.dependency_pct ?? 0, 100);
  score += Math.round((1 - dep / 100) * 30);
  const vol = Math.min(s.invoice_count ?? 0, 20);
  score += Math.round((vol / 20) * 30);
  return Math.min(score, 100);
}

function reliabilityColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function reliabilityBarColor(score: number): string {
  if (score >= 70) return "[&>div]:bg-success";
  if (score >= 40) return "[&>div]:bg-warning";
  return "[&>div]:bg-destructive";
}

function sparklineColor(data: { value: number }[]): string {
  if (data.length < 2) return "hsl(var(--muted-foreground))";
  const first = data[0].value;
  const last = data[data.length - 1].value;
  if (last > first * 1.02) return "hsl(0, 72%, 51%)"; // red - increasing
  if (last < first * 0.98) return "hsl(152, 56%, 45%)"; // green - decreasing
  return "hsl(var(--muted-foreground))"; // gray - stable
}

function MiniPriceChart({ data }: { data: { value: number }[] }) {
  if (data.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  const color = sparklineColor(data);

  return (
    <div className="w-[80px] h-[28px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props {
  data: SupplierPerformance[];
  priceData?: PriceVolatility[];
}

export function SupplierPerformanceSection({ data, priceData = [] }: Props) {
  const { t } = useLanguage();

  // Build sparkline data per supplier from price volatility
  const sparklines = useMemo(() => {
    const map: Record<string, { value: number }[]> = {};
    for (const p of priceData) {
      if (!map[p.supplier_name]) map[p.supplier_name] = [];
      map[p.supplier_name].push(
        { value: p.min_price },
        { value: p.avg_price },
        { value: p.latest_price },
        { value: p.max_price }
      );
    }
    // Sort each supplier's points by value for a meaningful shape
    for (const key of Object.keys(map)) {
      // Keep insertion order (min → avg → latest → max per product) for trend shape
    }
    return map;
  }, [priceData]);

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
              <TableHead>{t("analytics.col_trend")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_total_spend")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_invoices")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_avg_invoice")}</TableHead>
              <TableHead className="text-right">{t("analytics.col_dependency")}</TableHead>
              <TableHead>{t("analytics.col_reliability")}</TableHead>
              <TableHead>{t("analytics.col_risk")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s, i) => {
              const reliability = calcReliability(s);
              const chartData = sparklines[s.supplier_name] ?? [];
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.supplier_name}</TableCell>
                  <TableCell>
                    <MiniPriceChart data={chartData} />
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.total_spend)}</TableCell>
                  <TableCell className="text-right">{s.invoice_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.avg_invoice)}</TableCell>
                  <TableCell className="text-right">{(s.dependency_pct ?? 0).toFixed(1)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={reliability} className={`h-2 w-16 bg-muted ${reliabilityBarColor(reliability)}`} />
                      <span className={`text-sm font-bold ${reliabilityColor(reliability)}`}>
                        {reliability}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={riskColors[s.risk_level] ?? "bg-muted text-muted-foreground"}>
                      {riskLabelKeys[s.risk_level] ? t(riskLabelKeys[s.risk_level]) : s.risk_level}
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
