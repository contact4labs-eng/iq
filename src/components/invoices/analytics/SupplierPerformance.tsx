import { useMemo, useState, Fragment } from "react";
import type { SupplierPerformance, PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip as RechartsTooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { ChevronDown, ChevronUp, ArrowUpDown, Search, GitCompareArrows, X, Trophy, Crown } from "lucide-react";
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
export interface ScoreBreakdown {
  priceStability: number;
  deliveryReliability: number;
  costEfficiency: number;
  relationshipValue: number;
  total: number;
  grade: string;
}

const DIMENSION_KEYS: (keyof Omit<ScoreBreakdown, "total" | "grade">)[] = [
  "priceStability", "deliveryReliability", "costEfficiency", "relationshipValue",
];

const DIMENSION_LABEL_KEYS: Record<string, TranslationKey> = {
  priceStability: "analytics.dim_price_stability",
  deliveryReliability: "analytics.dim_delivery",
  costEfficiency: "analytics.dim_cost_efficiency",
  relationshipValue: "analytics.dim_relationship",
};

const RADAR_COLORS = [
  "hsl(217, 91%, 60%)",   // primary blue
  "hsl(152, 56%, 45%)",   // green
  "hsl(38, 92%, 50%)",    // amber
];

export function calcScoreBreakdown(s: SupplierPerformance, allSuppliers: SupplierPerformance[], priceData: PriceVolatility[]): ScoreBreakdown {
  const supplierProducts = priceData.filter(p => p.supplier_name === s.supplier_name);
  const avgVol = supplierProducts.length > 0
    ? supplierProducts.reduce((sum, p) => sum + (p.volatility ?? 0), 0) / supplierProducts.length
    : 0;
  const priceStability = Math.max(0, Math.min(100, 100 - avgVol * 5));

  let deliveryReliability = 50;
  if (s.risk_level === "low") deliveryReliability = 85;
  else if (s.risk_level === "medium") deliveryReliability = 55;
  else deliveryReliability = 25;
  const maxInvoices = Math.max(...allSuppliers.map(x => x.invoice_count), 1);
  deliveryReliability = Math.min(100, deliveryReliability + (s.invoice_count / maxInvoices) * 15);

  const maxAvg = Math.max(...allSuppliers.map(x => x.avg_invoice), 1);
  const costEfficiency = Math.max(0, Math.min(100, (1 - s.avg_invoice / maxAvg) * 60 + (1 - (s.dependency_pct ?? 0) / 100) * 40));

  const totalSpendAll = allSuppliers.reduce((sum, x) => sum + x.total_spend, 0) || 1;
  const spendShare = s.total_spend / totalSpendAll;
  const freqScore = Math.min(s.invoice_count / maxInvoices, 1);
  const relationshipValue = Math.min(100, (spendShare * 50 + freqScore * 50) * 100);

  const total = Math.round(
    priceStability * 0.30 + deliveryReliability * 0.25 + costEfficiency * 0.25 + relationshipValue * 0.20
  );

  let grade = "F";
  if (total >= 90) grade = "A+";
  else if (total >= 80) grade = "A";
  else if (total >= 70) grade = "B+";
  else if (total >= 60) grade = "B";
  else if (total >= 50) grade = "C";
  else if (total >= 40) grade = "D";

  return { priceStability: Math.round(priceStability), deliveryReliability: Math.round(deliveryReliability), costEfficiency: Math.round(costEfficiency), relationshipValue: Math.round(relationshipValue), total, grade };
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

type SortKey = "supplier_name" | "total_spend" | "invoice_count" | "avg_invoice" | "dependency_pct" | "score" | "risk_level";
type SortDir = "asc" | "desc";

// --- Expanded Row (single supplier) ---
function ExpandedRow({ s, breakdown, t }: { s: SupplierPerformance; breakdown: ScoreBreakdown; t: (key: TranslationKey) => string }) {
  const radarData = DIMENSION_KEYS.map(k => ({
    dimension: t(DIMENSION_LABEL_KEYS[k]),
    value: breakdown[k],
    fullMark: 100,
  }));

  const dimensions = [
    { label: t("analytics.dim_price_stability"), value: breakdown.priceStability, weight: "30%", color: "bg-primary" },
    { label: t("analytics.dim_delivery"), value: breakdown.deliveryReliability, weight: "25%", color: "bg-accent" },
    { label: t("analytics.dim_cost_efficiency"), value: breakdown.costEfficiency, weight: "25%", color: "bg-success" },
    { label: t("analytics.dim_relationship"), value: breakdown.relationshipValue, weight: "20%", color: "bg-warning" },
  ];

  return (
    <TableRow className="bg-muted/30 border-b-0">
      <TableCell colSpan={10} className="p-0">
        <div className="animate-accordion-down overflow-hidden">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-foreground mb-2">{t("analytics.score_breakdown")}</p>
              <div className="w-full max-w-[280px] h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name={s.supplier_name} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
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

// --- Comparison Panel ---
function ComparisonPanel({
  selected,
  onClose,
  t,
}: {
  selected: { s: SupplierPerformance; b: ScoreBreakdown }[];
  onClose: () => void;
  t: (key: TranslationKey) => string;
}) {
  // Build overlaid radar data
  const radarData = DIMENSION_KEYS.map((k) => {
    const point: Record<string, unknown> = { dimension: t(DIMENSION_LABEL_KEYS[k]) };
    selected.forEach(({ s, b }) => {
      point[s.supplier_name] = b[k];
    });
    return point;
  });

  // Find winner per dimension
  const dimensionWinners: Record<string, string> = {};
  for (const k of DIMENSION_KEYS) {
    let best = "";
    let bestVal = -1;
    for (const { s, b } of selected) {
      if (b[k] > bestVal) { bestVal = b[k]; best = s.supplier_name; }
    }
    dimensionWinners[k] = best;
  }

  // Overall winner
  const overallWinner = selected.reduce((best, curr) => curr.b.total > best.b.total ? curr : best, selected[0]);

  // Recommendation text
  const dimLabels = DIMENSION_KEYS.map(k => t(DIMENSION_LABEL_KEYS[k]));
  const winCounts: Record<string, number> = {};
  selected.forEach(({ s }) => { winCounts[s.supplier_name] = 0; });
  DIMENSION_KEYS.forEach(k => { winCounts[dimensionWinners[k]]++; });

  return (
    <Card className="border-primary/20 bg-primary/5 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompareArrows className="w-5 h-5 text-primary" />
          {t("analytics.compare_title")}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overlaid Radar */}
        <div className="flex justify-center">
          <div className="w-full max-w-[400px] h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                {selected.map(({ s }, idx) => (
                  <Radar
                    key={s.supplier_name}
                    name={s.supplier_name}
                    dataKey={s.supplier_name}
                    stroke={RADAR_COLORS[idx]}
                    fill={RADAR_COLORS[idx]}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("analytics.col_dimension")}</TableHead>
                {selected.map(({ s }, idx) => (
                  <TableHead key={s.supplier_name} className="text-center">
                    <span style={{ color: RADAR_COLORS[idx] }} className="font-semibold">{s.supplier_name}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {DIMENSION_KEYS.map((k, di) => {
                const winner = dimensionWinners[k];
                return (
                  <TableRow key={k}>
                    <TableCell className="font-medium text-sm">{dimLabels[di]}</TableCell>
                    {selected.map(({ s, b }) => {
                      const isWinner = s.supplier_name === winner;
                      return (
                        <TableCell key={s.supplier_name} className="text-center">
                          <span className={`font-bold text-sm ${isWinner ? "text-success" : "text-foreground"}`}>
                            {b[k]}
                            {isWinner && <Trophy className="inline w-3.5 h-3.5 ml-1 text-success" />}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {/* Overall row */}
              <TableRow className="border-t-2 border-primary/20 bg-muted/30">
                <TableCell className="font-bold text-sm">{t("analytics.compare_overall")}</TableCell>
                {selected.map(({ s, b }) => {
                  const isOverallWinner = s.supplier_name === overallWinner.s.supplier_name;
                  return (
                    <TableCell key={s.supplier_name} className="text-center">
                      <span className={`font-bold text-base ${isOverallWinner ? "text-success" : "text-foreground"}`}>
                        {b.total}
                        {isOverallWinner && <Crown className="inline w-4 h-4 ml-1 text-success" />}
                      </span>
                      <Badge className={`ml-2 ${gradeBadgeColor(b.grade)}`}>{b.grade}</Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Recommendation */}
        <div className="rounded-lg border border-success/20 bg-success/5 p-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-success" />
            {t("analytics.compare_recommendation")}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-success">{overallWinner.s.supplier_name}</span>
            {" "}{t("analytics.compare_rec_text")} ({overallWinner.b.total}/100, {t("analytics.col_grade")}: {overallWinner.b.grade}).
            {" "}{t("analytics.compare_rec_wins").replace("{count}", String(winCounts[overallWinner.s.supplier_name]))}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---
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
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<number>>(new Set());

  const breakdowns = useMemo(() => {
    return data.map((s) => calcScoreBreakdown(s, data, priceData));
  }, [data, priceData]);

  const sortedData = useMemo(() => {
    const indexed = data.map((s, i) => ({ s, b: breakdowns[i], i }));
    const filtered = search.trim()
      ? indexed.filter(({ s }) => s.supplier_name.toLowerCase().includes(search.toLowerCase()))
      : indexed;

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

  function toggleCompareMode() {
    if (compareMode) {
      setCompareMode(false);
      setSelectedForCompare(new Set());
    } else {
      setCompareMode(true);
      setExpandedIdx(null);
    }
  }

  function toggleSelection(idx: number) {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else if (next.size < 3) {
        next.add(idx);
      }
      return next;
    });
  }

  const comparisonData = useMemo(() => {
    return Array.from(selectedForCompare).map(i => ({ s: data[i], b: breakdowns[i] }));
  }, [selectedForCompare, data, breakdowns]);

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

  // Quick summary stats
  const topScored = sortedData.length > 0
    ? sortedData.reduce((best, curr) => curr.b.total > best.b.total ? curr : best, sortedData[0])
    : null;
  const highestSpender = data.length > 0
    ? data.reduce((max, s) => s.total_spend > max.total_spend ? s : max, data[0])
    : null;
  const totalSupplierSpend = data.reduce((sum, s) => sum + s.total_spend, 0);

  return (
    <div className="space-y-4">
      {/* Quick summary cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mt-4">
        {topScored && (
          <Card className="border border-success/30 bg-success/5 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("analytics.top_supplier")}</p>
                <p className="text-sm font-bold text-foreground truncate">{topScored.s.supplier_name}</p>
                <p className="text-xs text-success font-medium">{t("analytics.col_score")}: {topScored.b.total}/100</p>
              </div>
            </CardContent>
          </Card>
        )}
        {highestSpender && (
          <Card className="border border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("analytics.highest_spend")}</p>
                <p className="text-sm font-bold text-foreground truncate">{highestSpender.supplier_name}</p>
                <p className="text-xs text-primary font-medium">{formatCurrency(highestSpender.total_spend)}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border border-border/60 bg-muted/30 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("analytics.total_suppliers_spend")}</p>
              <p className="text-sm font-bold text-foreground">{data.length} {t("analytics.suppliers_label")}</p>
              <p className="text-xs text-muted-foreground font-medium">{formatCurrency(totalSupplierSpend)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">{t("analytics.supplier_perf")}</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("analytics.search_supplier")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={toggleCompareMode}
              className="gap-1.5 shrink-0"
            >
              {compareMode ? <X className="w-4 h-4" /> : <GitCompareArrows className="w-4 h-4" />}
              {compareMode ? t("analytics.compare_exit") : t("analytics.compare_btn")}
            </Button>
          </div>
        </CardHeader>

        {compareMode && (
          <div className="px-6 pb-2">
            <p className="text-xs text-muted-foreground">
              {t("analytics.compare_hint")} ({selectedForCompare.size}/3)
            </p>
          </div>
        )}

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {compareMode ? (
                  <TableHead className="w-10" />
                ) : (
                  <TableHead className="w-8" />
                )}
                <SortableHead colKey="supplier_name">{t("analytics.col_supplier")}</SortableHead>
                <SortableHead colKey="score">{t("analytics.col_score")}</SortableHead>
                <SortableHead colKey="total_spend" className="text-right">{t("analytics.col_total_spend")}</SortableHead>
                <SortableHead colKey="invoice_count" className="text-right">{t("analytics.col_invoices")}</SortableHead>
                <SortableHead colKey="avg_invoice" className="text-right">{t("analytics.col_avg_invoice")}</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map(({ s, b, i }) => {
                const isExpanded = !compareMode && expandedIdx === i;
                const isSelected = selectedForCompare.has(i);
                return (
                  <Fragment key={`frag-${i}`}>
                    <TableRow
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 hover:bg-primary/15" :
                        isExpanded ? "bg-muted/40" : "hover:bg-muted/30"
                      }`}
                      onClick={() => {
                        if (compareMode) {
                          toggleSelection(i);
                        } else {
                          setExpandedIdx(isExpanded ? null : i);
                        }
                      }}
                    >
                      <TableCell className="w-10 px-2">
                        {compareMode ? (
                          <Checkbox
                            checked={isSelected}
                            disabled={!isSelected && selectedForCompare.size >= 3}
                            onCheckedChange={() => toggleSelection(i)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          isExpanded
                            ? <ChevronUp className="w-4 h-4 text-primary" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.supplier_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <Progress value={b.total} className={`h-2 w-12 bg-muted ${b.total >= 70 ? "[&>div]:bg-success" : b.total >= 40 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`} />
                          <span className="text-sm font-bold text-foreground">{b.total}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(s.total_spend)}</TableCell>
                      <TableCell className="text-right">{s.invoice_count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.avg_invoice)}</TableCell>
                    </TableRow>
                    {isExpanded && <ExpandedRow s={s} breakdown={b} t={t} />}
                  </Fragment>
                );
              })}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    {t("analytics.no_data")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>  {/* end main supplier table card */}

      {/* Comparison Panel */}
      {compareMode && comparisonData.length >= 2 && (
        <ComparisonPanel
          selected={comparisonData}
          onClose={toggleCompareMode}
          t={t}
        />
      )}
    </div>
  );
}
