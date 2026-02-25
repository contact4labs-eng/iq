import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  Truck,
  Search,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { Ingredient } from "@/hooks/useIngredients";
import type { MarginThreshold } from "@/hooks/useMarginThresholds";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

// ── Industry standard food margins by category ───────────────────────────
const INDUSTRY_MARGINS: Record<string, { target: number; min: number; label_el: string; label_en: string }> = {
  "Ποτά": { target: 75, min: 65, label_el: "Ποτά", label_en: "Beverages" },
  "Beverages": { target: 75, min: 65, label_el: "Ποτά", label_en: "Beverages" },
  "Καφές": { target: 80, min: 70, label_el: "Καφές", label_en: "Coffee" },
  "Coffee": { target: 80, min: 70, label_el: "Καφές", label_en: "Coffee" },
  "Σαλάτες": { target: 70, min: 60, label_el: "Σαλάτες", label_en: "Salads" },
  "Salads": { target: 70, min: 60, label_el: "Σαλάτες", label_en: "Salads" },
  "Ορεκτικά": { target: 65, min: 55, label_el: "Ορεκτικά", label_en: "Appetizers" },
  "Appetizers": { target: 65, min: 55, label_el: "Ορεκτικά", label_en: "Appetizers" },
  "Κυρίως": { target: 60, min: 50, label_el: "Κυρίως", label_en: "Mains" },
  "Mains": { target: 60, min: 50, label_el: "Κυρίως", label_en: "Mains" },
  "Επιδόρπια": { target: 70, min: 60, label_el: "Επιδόρπια", label_en: "Desserts" },
  "Desserts": { target: 70, min: 60, label_el: "Επιδόρπια", label_en: "Desserts" },
  "Σνακ": { target: 65, min: 55, label_el: "Σνακ", label_en: "Snacks" },
  "Snacks": { target: 65, min: 55, label_el: "Σνακ", label_en: "Snacks" },
  "Πίτσα": { target: 65, min: 55, label_el: "Πίτσα", label_en: "Pizza" },
  "Pizza": { target: 65, min: 55, label_el: "Πίτσα", label_en: "Pizza" },
  "Μπέργκερ": { target: 60, min: 50, label_el: "Μπέργκερ", label_en: "Burgers" },
  "Burgers": { target: 60, min: 50, label_el: "Μπέργκερ", label_en: "Burgers" },
  "Σάντουιτς": { target: 65, min: 55, label_el: "Σάντουιτς", label_en: "Sandwiches" },
  "Sandwiches": { target: 65, min: 55, label_el: "Σάντουιτς", label_en: "Sandwiches" },
};

const DEFAULT_INDUSTRY_MARGIN = { target: 65, min: 50 };

// ── Types ────────────────────────────────────────────────────────────────
interface ProductAnalysis {
  product: Product;
  cost: number;
  currentMarginDinein: number;
  currentMarginDelivery: number;
  targetMargin: number;
  industryMinMargin: number;
  suggestedPriceDinein: number;
  suggestedPriceDelivery: number;
  deliveryGapAnalysis: DeliveryGapItem[];
  status: "healthy" | "warning" | "critical";
  advice: { el: string; en: string }[];
}

interface DeliveryGapItem {
  platformName: string;
  commission: number;
  effectiveMargin: number;
  suggestedDeliveryPrice: number;
  gap: number;
}

interface PricingAdvisorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  ingredients: Ingredient[];
  costMap: Map<string, number>;
  thresholds: MarginThreshold[];
  platforms: DeliveryPlatform[];
  getMarginColor: (category: string, marginPercent: number) => "green" | "yellow" | "red";
}

// ── Helpers ──────────────────────────────────────────────────────────────

function marginPercent(sellingPrice: number, cost: number): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
}

function priceForTargetMargin(cost: number, targetMarginPct: number): number {
  if (targetMarginPct >= 100) return cost * 10;
  return cost / (1 - targetMarginPct / 100);
}

function roundPrice(price: number): number {
  const base = Math.floor(price);
  const decimal = price - base;
  if (decimal <= 0.25) return base + 0.00;
  if (decimal <= 0.65) return base + 0.50;
  return base + 0.90;
}

function getIndustryMargin(category: string) {
  return INDUSTRY_MARGINS[category] ?? DEFAULT_INDUSTRY_MARGIN;
}

function analyzeProduct(
  product: Product,
  cost: number,
  thresholds: MarginThreshold[],
  platforms: DeliveryPlatform[]
): ProductAnalysis {
  const industryData = getIndustryMargin(product.category);
  const threshold = thresholds.find((t) => t.category === product.category);
  const targetMargin = threshold?.green_min ?? industryData.target;
  const industryMinMargin = industryData.min;

  const currentMarginDinein = marginPercent(product.selling_price_dinein, cost);
  const currentMarginDelivery = marginPercent(product.selling_price_delivery, cost);

  const suggestedPriceDinein = cost > 0 ? roundPrice(priceForTargetMargin(cost, targetMargin)) : 0;

  // Delivery gap analysis using user's actual platforms from DB
  const deliveryGapAnalysis: DeliveryGapItem[] = platforms.map((platform) => {
    const commission = platform.commission_percent / 100;
    const effectiveRevenue = product.selling_price_delivery * (1 - commission);
    const effectiveMargin = cost > 0 ? marginPercent(effectiveRevenue, cost) : 0;
    const suggestedDeliveryPrice = cost > 0
      ? roundPrice(priceForTargetMargin(cost, targetMargin) / (1 - commission))
      : 0;
    const gap = suggestedDeliveryPrice - product.selling_price_delivery;

    return {
      platformName: platform.name,
      commission,
      effectiveMargin,
      suggestedDeliveryPrice,
      gap,
    };
  });

  const suggestedPriceDelivery = deliveryGapAnalysis.length > 0
    ? deliveryGapAnalysis[0].suggestedDeliveryPrice
    : (cost > 0 ? roundPrice(priceForTargetMargin(cost, targetMargin)) : 0);

  // Status
  let status: "healthy" | "warning" | "critical" = "healthy";
  if (currentMarginDinein < industryMinMargin || (product.selling_price_delivery > 0 && currentMarginDelivery < industryMinMargin)) {
    status = "critical";
  } else if (currentMarginDinein < targetMargin || (product.selling_price_delivery > 0 && currentMarginDelivery < targetMargin)) {
    status = "warning";
  }

  // Generate advice
  const advice: { el: string; en: string }[] = [];

  if (cost === 0) {
    advice.push({
      el: "Δεν υπάρχει κόστος — προσθέστε συνταγή ή συνδέστε υλικό.",
      en: "No cost data — add a recipe or link an ingredient.",
    });
  } else {
    if (currentMarginDinein < targetMargin && product.selling_price_dinein > 0) {
      const diff = suggestedPriceDinein - product.selling_price_dinein;
      advice.push({
        el: `Η τιμή dine-in (€${product.selling_price_dinein.toFixed(2)}) είναι χαμηλή. Προτείνεται αύξηση κατά €${diff.toFixed(2)} → €${suggestedPriceDinein.toFixed(2)} για στόχο ${targetMargin}% κέρδος.`,
        en: `Dine-in price (€${product.selling_price_dinein.toFixed(2)}) is below target. Suggest increasing by €${diff.toFixed(2)} → €${suggestedPriceDinein.toFixed(2)} for ${targetMargin}% margin.`,
      });
    }

    if (currentMarginDinein >= targetMargin && product.selling_price_dinein > 0) {
      advice.push({
        el: `Η τιμή dine-in (€${product.selling_price_dinein.toFixed(2)}) είναι σε καλό επίπεδο με ${currentMarginDinein.toFixed(1)}% κέρδος.`,
        en: `Dine-in price (€${product.selling_price_dinein.toFixed(2)}) is healthy at ${currentMarginDinein.toFixed(1)}% margin.`,
      });
    }

    const hasDeliveryPrice = product.selling_price_delivery > 0;
    if (hasDeliveryPrice && deliveryGapAnalysis.length > 0) {
      const worstPlatform = deliveryGapAnalysis.reduce((a, b) =>
        a.effectiveMargin < b.effectiveMargin ? a : b
      );
      if (worstPlatform.effectiveMargin < industryMinMargin) {
        advice.push({
          el: `Στο ${worstPlatform.platformName} (${(worstPlatform.commission * 100).toFixed(0)}% προμήθεια), το πραγματικό κέρδος πέφτει στο ${worstPlatform.effectiveMargin.toFixed(1)}%. Προτείνεται delivery τιμή €${worstPlatform.suggestedDeliveryPrice.toFixed(2)}.`,
          en: `On ${worstPlatform.platformName} (${(worstPlatform.commission * 100).toFixed(0)}% commission), effective margin drops to ${worstPlatform.effectiveMargin.toFixed(1)}%. Suggest delivery price €${worstPlatform.suggestedDeliveryPrice.toFixed(2)}.`,
        });
      }
    } else if (hasDeliveryPrice && deliveryGapAnalysis.length === 0) {
      advice.push({
        el: "Προσθέστε πλατφόρμες delivery στις ρυθμίσεις COGS για ανάλυση πραγματικών περιθωρίων.",
        en: "Add delivery platforms in COGS settings to analyze real delivery margins.",
      });
    } else if (product.selling_price_dinein > 0 && !hasDeliveryPrice) {
      advice.push({
        el: "Δεν έχει οριστεί τιμή delivery. Αν πουλάτε μέσω πλατφόρμας, ορίστε τιμή delivery υψηλότερη λόγω προμηθειών.",
        en: "No delivery price set. If selling via platforms, set a higher delivery price to cover commissions.",
      });
    }
  }

  return {
    product,
    cost,
    currentMarginDinein,
    currentMarginDelivery,
    targetMargin,
    industryMinMargin,
    suggestedPriceDinein,
    suggestedPriceDelivery,
    deliveryGapAnalysis,
    status,
    advice,
  };
}

// ── Component ────────────────────────────────────────────────────────────

export function PricingAdvisor({
  open,
  onOpenChange,
  products,
  costMap,
  thresholds,
  platforms,
}: PricingAdvisorProps) {
  const { t, language } = useLanguage();
  const [advisorTab, setAdvisorTab] = useState<"overview" | "single">("overview");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const analyses = useMemo(() => {
    return products
      .filter((p) => p.selling_price_dinein > 0 || p.selling_price_delivery > 0)
      .map((p) => analyzeProduct(p, costMap.get(p.id) ?? 0, thresholds, platforms))
      .sort((a, b) => {
        const statusOrder = { critical: 0, warning: 1, healthy: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
  }, [products, costMap, thresholds, platforms]);

  const selectedAnalysis = useMemo(() => {
    if (!selectedProductId) return null;
    const p = products.find((p) => p.id === selectedProductId);
    if (!p) return null;
    return analyzeProduct(p, costMap.get(p.id) ?? 0, thresholds, platforms);
  }, [selectedProductId, products, costMap, thresholds, platforms]);

  const filteredAnalyses = useMemo(() => {
    if (!search) return analyses;
    const q = search.toLowerCase();
    return analyses.filter(
      (a) => a.product.name.toLowerCase().includes(q) || a.product.category.toLowerCase().includes(q)
    );
  }, [analyses, search]);

  const summary = useMemo(() => {
    const critical = analyses.filter((a) => a.status === "critical").length;
    const warning = analyses.filter((a) => a.status === "warning").length;
    const healthy = analyses.filter((a) => a.status === "healthy").length;
    const potentialRevenue = analyses
      .filter((a) => a.suggestedPriceDinein > a.product.selling_price_dinein)
      .reduce((sum, a) => sum + (a.suggestedPriceDinein - a.product.selling_price_dinein), 0);

    return { critical, warning, healthy, potentialRevenue, total: analyses.length };
  }, [analyses]);

  const toggleExpanded = (id: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusIcon = (status: "healthy" | "warning" | "critical") => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "critical":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };

  const statusBadge = (status: "healthy" | "warning" | "critical") => {
    const variants: Record<string, string> = {
      healthy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    const labels = {
      healthy: { el: "Υγιές", en: "Healthy" },
      warning: { el: "Προσοχή", en: "Warning" },
      critical: { el: "Κρίσιμο", en: "Critical" },
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${variants[status]}`}>
        {statusIcon(status)}
        {labels[status][language]}
      </span>
    );
  };

  const renderProductDetail = (analysis: ProductAnalysis) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">{analysis.product.name}</h3>
          <span className="text-xs text-muted-foreground">{analysis.product.category}</span>
        </div>
        {statusBadge(analysis.status)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {t("pricing.cost")}
          </p>
          <p className="text-lg font-bold font-mono">€{analysis.cost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {t("pricing.target_margin")}
          </p>
          <p className="text-lg font-bold font-mono">{analysis.targetMargin}%</p>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" />
          {t("pricing.price_comparison")}
        </h4>

        {analysis.product.selling_price_dinein > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t("cogs.price_dinein")}</p>
              <p className="font-mono">
                €{analysis.product.selling_price_dinein.toFixed(2)}
                <span className="text-xs ml-1 text-muted-foreground">({analysis.currentMarginDinein.toFixed(1)}%)</span>
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t("pricing.suggested")}</p>
              <p className={`font-mono font-medium ${analysis.suggestedPriceDinein > analysis.product.selling_price_dinein ? "text-amber-600" : "text-green-600"}`}>
                €{analysis.suggestedPriceDinein.toFixed(2)}
                <span className="text-xs ml-1">({analysis.targetMargin}%)</span>
              </p>
            </div>
          </div>
        )}

        {analysis.product.selling_price_delivery > 0 && (
          <div className="flex items-center justify-between text-sm border-t pt-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("cogs.price_delivery")}</p>
              <p className="font-mono">
                €{analysis.product.selling_price_delivery.toFixed(2)}
                <span className="text-xs ml-1 text-muted-foreground">({analysis.currentMarginDelivery.toFixed(1)}%)</span>
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t("pricing.suggested")}</p>
              <p className={`font-mono font-medium ${analysis.suggestedPriceDelivery > analysis.product.selling_price_delivery ? "text-amber-600" : "text-green-600"}`}>
                €{analysis.suggestedPriceDelivery.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {analysis.product.selling_price_delivery > 0 && analysis.deliveryGapAnalysis.length > 0 && (
        <div className="rounded-lg border p-3 space-y-3">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" />
            {t("pricing.delivery_gap")}
          </h4>
          <div className="space-y-2">
            {analysis.deliveryGapAnalysis.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.platformName}</span>
                  <span className="text-muted-foreground">({(item.commission * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono ${item.effectiveMargin < analysis.industryMinMargin ? "text-red-500 font-medium" : item.effectiveMargin < analysis.targetMargin ? "text-yellow-600" : "text-green-600"}`}>
                    {item.effectiveMargin.toFixed(1)}%
                  </span>
                  {item.gap > 0 && (
                    <span className="text-amber-600 font-mono">
                      +€{item.gap.toFixed(2)} → €{item.suggestedDeliveryPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-3 space-y-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          {t("pricing.advice")}
        </h4>
        <div className="space-y-1.5">
          {analysis.advice.map((a, i) => (
            <p key={i} className="text-xs leading-relaxed text-muted-foreground">
              {a[language]}
            </p>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            {t("pricing.title")}
          </SheetTitle>
          <SheetDescription>
            {t("pricing.subtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Tabs value={advisorTab} onValueChange={(v) => setAdvisorTab(v as "overview" | "single")}>
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1 gap-1.5 text-xs">
                <BarChart3 className="w-3.5 h-3.5" />
                {t("pricing.tab_overview")}
              </TabsTrigger>
              <TabsTrigger value="single" className="flex-1 gap-1.5 text-xs">
                <Target className="w-3.5 h-3.5" />
                {t("pricing.tab_single")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-red-50 dark:bg-red-900/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{summary.critical}</p>
                  <p className="text-[10px] text-red-600/70 dark:text-red-400/70">{t("pricing.critical")}</p>
                </div>
                <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{summary.warning}</p>
                  <p className="text-[10px] text-yellow-600/70 dark:text-yellow-400/70">{t("pricing.warning")}</p>
                </div>
                <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{summary.healthy}</p>
                  <p className="text-[10px] text-green-600/70 dark:text-green-400/70">{t("pricing.healthy")}</p>
                </div>
              </div>

              {summary.potentialRevenue > 0 && (
                <div className="rounded-lg border bg-primary/5 p-3 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{t("pricing.potential_uplift")}</p>
                    <p className="text-sm font-bold font-mono text-primary">
                      +€{summary.potentialRevenue.toFixed(2)} {t("pricing.per_item")}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("pricing.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="rounded-lg border divide-y max-h-[50vh] overflow-y-auto">
                {filteredAnalyses.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t("pricing.no_products")}
                  </div>
                ) : (
                  filteredAnalyses.map((analysis) => {
                    const isExpanded = expandedProducts.has(analysis.product.id);
                    return (
                      <div key={analysis.product.id}>
                        <button
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                          onClick={() => toggleExpanded(analysis.product.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {statusIcon(analysis.status)}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{analysis.product.name}</p>
                              <p className="text-[10px] text-muted-foreground">{analysis.product.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-xs font-mono">{analysis.currentMarginDinein.toFixed(1)}%</p>
                              <p className="text-[10px] text-muted-foreground">€{analysis.cost.toFixed(2)}</p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t bg-muted/20">
                            <div className="pt-3">
                              {renderProductDetail(analysis)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="single" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">{t("pricing.select_product")}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("pricing.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                  {products
                    .filter((p) => {
                      if (!search) return true;
                      const q = search.toLowerCase();
                      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                    })
                    .map((p) => (
                      <button
                        key={p.id}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors ${selectedProductId === p.id ? "bg-primary/10" : ""}`}
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setSearch("");
                        }}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{p.category}</span>
                      </button>
                    ))}
                </div>
              </div>

              {selectedAnalysis ? (
                renderProductDetail(selectedAnalysis)
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t("pricing.select_prompt")}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Floating Button ──────────────────────────────────────────────────────

export function PricingAdvisorFAB({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-3 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 transition-all duration-200 group"
      title={t("pricing.title")}
    >
      <Lightbulb className="w-5 h-5" />
      <span className="text-sm font-medium max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 whitespace-nowrap">
        {t("pricing.fab_label")}
      </span>
    </button>
  );
}
