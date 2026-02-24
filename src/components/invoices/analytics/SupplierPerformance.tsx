import { useMemo, useState, Fragment } from "react";
import type { SupplierPerformance, PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, ArrowUpDown, Search, Crown } from "lucide-react";
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

type SortKey = "supplier_name" | "total_spend" | "invoice_count" | "avg_invoice" | "dependency_pct" | "risk_level";
type SortDir = "asc" | "desc";

// --- Expanded Row (single supplier details) ---
function ExpandedRow({ s, t }: { s: SupplierPerformance; t: (key: TranslationKey) => string }) {
  return (
    <TableRow className="bg-muted/30 border-b-0">
      <TableCell colSpan={8} className="p-0">
        <div className="animate-accordion-down overflow-hidden">
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("analytics.col_total_spend")}</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(s.total_spend)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("analytics.col_invoices")}</p>
              <p className="text-sm font-bold text-foreground">{s.invoice_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("analytics.col_avg_invoice")}</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(s.avg_invoice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("analytics.col_dependency")}</p>
              <p className="text-sm font-bold text-foreground">{(s.dependency_pct ?? 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
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

  const sortedData = useMemo(() => {
    const indexed = data.map((s, i) => ({ s, i }));
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
  }, [data, search, sortKey, sortDir]);

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

  // Quick summary stats
  const highestSpender = data.reduce((max, s) => s.total_spend > max.total_spend ? s : max, data[0]);
  const totalSupplierSpend = data.reduce((sum, s) => sum + s.total_spend, 0);

  return (
    <div className="space-y-4">
      {/* Quick summary cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mt-4">
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
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <SortableHead colKey="supplier_name">{t("analytics.col_supplier")}</SortableHead>
                <SortableHead colKey="total_spend" className="text-right">{t("analytics.col_total_spend")}</SortableHead>
                <SortableHead colKey="invoice_count" className="text-right">{t("analytics.col_invoices")}</SortableHead>
                <SortableHead colKey="avg_invoice" className="text-right">{t("analytics.col_avg_invoice")}</SortableHead>
                <SortableHead colKey="dependency_pct" className="text-right">{t("analytics.col_dependency")}</SortableHead>
                <SortableHead colKey="risk_level">{t("analytics.col_risk")}</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map(({ s, i }) => {
                const isExpanded = expandedIdx === i;
                return (
                  <Fragment key={`frag-${i}`}>
                    <TableRow
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? "bg-muted/40" : "hover:bg-muted/30"
                      }`}
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    >
                      <TableCell className="w-8 px-2">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-primary" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium">{s.supplier_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.total_spend)}</TableCell>
                      <TableCell className="text-right">{s.invoice_count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.avg_invoice)}</TableCell>
                      <TableCell className="text-right">{(s.dependency_pct ?? 0).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge className={riskColors[s.risk_level] ?? "bg-muted"}>
                          {t(riskLabelKeys[s.risk_level] ?? "analytics.risk_low")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && <ExpandedRow s={s} t={t} />}
                  </Fragment>
                );
              })}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t("analytics.no_data")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
