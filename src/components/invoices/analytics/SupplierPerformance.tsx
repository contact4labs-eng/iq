import { useMemo, useState } from "react";
import type { SupplierPerformance, PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ChevronDown, ChevronUp, ArrowUpDown, Search } from "lucide-react";
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

// --- Score calculation with 4 dimensions ---
interface ScoreBreakdown {
  priceStability: number;   // 30%
  deliveryReliability: number; // 25%
  costEfficiency: number;   // 25%
  relationshipValue: number; // 20%
  total: number;
  grade: string;
}

function calcScoreBreakdown(s: SupplierPerformance, allSuppliers: SupplierPerformance[], priceData: PriceVolatility[]): ScoreBreakdown {
  // Price Stability: based on volatility of products from this supplier
  const supplierProducts = priceData.filter(p => p.supplier_name === s.supplier_name);
  const avgVol = supplierProducts.length > 0
    ? supplierProducts.reduce((sum, p) => sum + (p.volatility ?? 0), 0) / supplierProducts.length
    : 0;
  const priceStability = Math.max(0, Math.min(100, 100 - avgVol * 5));

  // Delivery Reliability: based on risk level and invoice count consistency
  let deliveryReliability = 50;
  if (s.risk_level === "low") deliveryReliability = 85;
  else if (s.risk_level === "medium") deliveryReliability = 55;
  else deliveryReliability = 25;
  // Bonus for high invoice count (regular orders suggest reliable delivery)
  const maxInvoices = Math.max(...allSuppliers.map(x => x.invoice_count), 1);
  deliveryReliability = Math.min(100, deliveryReliability + (s.invoice_count / maxInvoices) * 15);

  // Cost Efficiency: lower dependency and avg invoice relative to peers = better
  const maxAvg = Math.max(...allSuppliers.map(x => x.avg_invoice), 1);
  const costEfficiency = Math.max(0, Math.min(100, (1 - s.avg_invoice / maxAvg) * 60 + (1 - (s.dependency_pct ?? 0) / 100) * 40));

  // Relationship Value: based on total spend share and invoice frequency
  const totalSpendAll = allSuppliers.reduce((sum, x) => sum + x.total_spend, 0) || 1;
  const spendShare = s.total_spend / totalSpendAll;
  const freqScore = Math.min(s.invoice_count / maxInvoices, 1);
  const relationshipValue = Math.min(100, (spendShare * 50 + freqScore * 50) * 100);

  const total = Math.round(
    priceStability * 0.30 +
    deliveryReliability * 0.25 +
    costEfficiency * 0.25 +
    relationshipValue * 0.20
  );

  let grade = "F";
  if (total >= 90) grade = "A+";
  else if (total >= 80) grade = "A";
  else if (total >= 70) grade = "B+";
  else if (total >= 60) grade = "B";
  else if (total >= 50) grade = "C";
  else if (total >= 40) grade = "D";

  return {
    priceStability: Math.round(priceStability),
    deliveryReliability: Math.round(deliveryReliability),
    costEfficiency: Math.round(costEfficiency),
    relationshipValue: Math.round(relationshipValue),
    total,
    grade,
  };
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-success";
  if (grade.startsWith("B")) return "text-primary";
  if (grade === "C") return "text-warning";
  return "text-destructive";
}

function gradeBadgeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-success text-success-foreground";
  if (grade.startsWith("B")) return "bg-primary text-primary-foreground";
  if (grade === "C") return "bg-warning text-warning-foreground";
  return "bg-destructive text-destructive-foreground";
}

type SortKey = "supplier_name" | "total_spend" | "invoice_count" | "avg_invoice" | "dependency_pct" | "score" | "grade" | "risk_level";
type SortDir = "asc" | "desc";

function ExpandedRow({ s, breakdown, t }: { s: SupplierPerformance; breakdown: ScoreBreakdown; t: (key: TranslationKey) => string }) {
  const radarData = [
    { dimension: t("analytics.dim_price_stability"), value: breakdown.priceStability, fullMark: 100 },
    { dimension: t("analytics.dim_delivery"), value: breakdown.deliveryReliability, fullMark: 100 },
    { dimension: t("analytics.dim_cost_efficiency"), value: breakdown.costEfficiency, fullMark: 100 },
    { dimension: t("analytics.dim_relationship"), value: breakdown.relationshipValue, fullMark: 100 },
  ];

  const dimensions = [
    { label: t("analytics.dim_price_stability"), value: breakdown.priceStability, weight: "30%", color: "bg-primary" },
    { label: t("analytics.dim_delivery"), value: breakdown.deliveryReliability, weight: "25%", color: "bg-accent" },
    { label: t("analytics.dim_cost_efficiency"), value: breakdown.costEfficiency, weight: "25%", color: "bg-success" },
    { label: t("analytics.dim_relationship"), value: breakdown.relationshipValue, weight: "20%", color: "bg-warning" },
  ];

  return (
    <TableRow className="bg-muted/30 border-b-0">
      <TableCell colSpan={9} className="p-0">
        <div className="animate-accordion-down overflow-hidden">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-foreground mb-2">{t("analytics.score_breakdown")}</p>
              <div className="w-full max-w-[280px] h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name={s.supplier_name}
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score Breakdown Bars */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-2xl font-bold ${gradeColor(breakdown.grade)}`}>{breakdown.grade}</span>
                <span className="text-lg font-semibold text-foreground">{breakdown.total}/100</span>
              </div>
              {dimensions.map((dim) => (
                <div key={dim.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{dim.label} <span className="text-muted-foreground/60">({dim.weight})</span></span>
                    <span className="font-medium text-foreground">{dim.value}</span>
                  </div>
                  <Progress value={dim.value} className={`h-2 bg-muted [&>div]:${dim.color}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface Props {
  data: SupplierPerformance[];
  priceData?: PriceVolatility[];
}

export function SupplierPerformanceSection({ data, priceData = [] }: Props) {
  const { t } = useLanguage();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total_spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  // Pre-compute breakdowns
  const breakdowns = useMemo(() => {
    return data.map((s) => calcScoreBreakdown(s, data, priceData));
  }, [data, priceData]);

  // Filtered + sorted
  const sortedData = useMemo(() => {
    const indexed = data.map((s, i) => ({ s, b: breakdowns[i], i }));

    // Filter by search
    const filtered = search.trim()
      ? indexed.filter(({ s }) => s.supplier_name.toLowerCase().includes(search.toLowerCase()))
      : indexed;

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortKey) {
        case "supplier_name": aVal = a.s.supplier_name.toLowerCase(); bVal = b.s.supplier_name.toLowerCase(); break;
        case "total_spend": aVal = a.s.total_spend; bVal = b.s.total_spend; break;
        case "invoice_count": aVal = a.s.invoice_count; bVal = b.s.invoice_count; break;
        case "avg_invoice": aVal = a.s.avg_invoice; bVal = b.s.avg_invoice; break;
        case "dependency_pct": aVal = a.s.dependency_pct ?? 0; bVal = b.s.dependency_pct ?? 0; break;
        case "score": aVal = a.b.total; bVal = b.b.total; break;
        case "grade": aVal = a.b.total; bVal = b.b.total; break;
        case "risk_level": {
          const order = { high: 3, medium: 2, low: 1 };
          aVal = order[a.s.risk_level as keyof typeof order] ?? 0;
          bVal = order[b.s.risk_level as keyof typeof order] ?? 0;
          break;
        }
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [data, breakdowns, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortableHead({ colKey, children, className }: { colKey: SortKey; children: React.ReactNode; className?: string }) {
    const active = sortKey === colKey;
    return (
      <TableHead
        className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className ?? ""}`}
        onClick={() => toggleSort(colKey)}
      >
        <div className="flex items-center gap-1">
          {children}
          {active ? (
            sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
          )}
        </div>
      </TableHead>
    );
  }

  if (!data.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-lg">{t("analytics.supplier_perf")}</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("analytics.search_supplier")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <SortableHead colKey="supplier_name">{t("analytics.col_supplier")}</SortableHead>
              <SortableHead colKey="score">{t("analytics.col_score")}</SortableHead>
              <SortableHead colKey="grade">{t("analytics.col_grade")}</SortableHead>
              <SortableHead colKey="total_spend" className="text-right">{t("analytics.col_total_spend")}</SortableHead>
              <SortableHead colKey="invoice_count" className="text-right">{t("analytics.col_invoices")}</SortableHead>
              <SortableHead colKey="avg_invoice" className="text-right">{t("analytics.col_avg_invoice")}</SortableHead>
              <SortableHead colKey="dependency_pct" className="text-right">{t("analytics.col_dependency")}</SortableHead>
              <SortableHead colKey="risk_level">{t("analytics.col_risk")}</SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map(({ s, b, i }) => {
              const isExpanded = expandedIdx === i;
              return (
                <>
                  <TableRow
                    key={`row-${i}`}
                    className={`cursor-pointer transition-colors ${isExpanded ? "bg-muted/40" : "hover:bg-muted/30"}`}
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  >
                    <TableCell className="w-8 px-2">
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-primary" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </TableCell>
                    <TableCell className="font-medium">{s.supplier_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <Progress value={b.total} className={`h-2 w-12 bg-muted ${b.total >= 70 ? "[&>div]:bg-success" : b.total >= 40 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`} />
                        <span className="text-sm font-bold text-foreground">{b.total}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={gradeBadgeColor(b.grade)}>{b.grade}</Badge>
                    </TableCell>
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
                  {isExpanded && (
                    <ExpandedRow key={`expanded-${i}`} s={s} breakdown={b} t={t} />
                  )}
                </>
              );
            })}
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {t("analytics.no_data")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
