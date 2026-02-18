import { useState, useMemo } from "react";
import { Search, Store, Package, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { PriceAlertCards } from "./PriceAlertCards";
import { SupplierDrilldown } from "./SupplierDrilldown";
import { ProductDrilldown } from "./ProductDrilldown";
import type { PriceVolatility, SupplierPerformance } from "@/hooks/useInvoiceAnalytics";

type TimeRange = "30d" | "90d" | "6m" | "1y" | "all";
type PriceDirection = "all" | "increases" | "decreases";

export function PriceTrendAnalysis({
  priceData,
  suppliers,
}: {
  priceData: PriceVolatility[];
  suppliers: SupplierPerformance[];
}) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [direction, setDirection] = useState<PriceDirection>("all");

  // Filter by price direction
  const filteredData = useMemo(() => {
    let result = priceData;
    if (direction === "increases") {
      result = result.filter((p) => p.avg_price > 0 && p.latest_price > p.avg_price);
    } else if (direction === "decreases") {
      result = result.filter((p) => p.avg_price > 0 && p.latest_price < p.avg_price);
    }
    return result;
  }, [priceData, direction]);

  return (
    <div className="space-y-6 mt-4">
      {/* Price alert warning cards */}
      <PriceAlertCards data={priceData} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          {t("analytics.filters")}
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="30d">{t("analytics.last_30d")}</SelectItem>
            <SelectItem value="90d">{t("analytics.last_90d")}</SelectItem>
            <SelectItem value="6m">{t("analytics.last_6m")}</SelectItem>
            <SelectItem value="1y">{t("analytics.last_1y")}</SelectItem>
            <SelectItem value="all">{t("analytics.all_time")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={(v) => setDirection(v as PriceDirection)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="all">{t("analytics.all_directions")}</SelectItem>
            <SelectItem value="increases">{t("analytics.increases_only")}</SelectItem>
            <SelectItem value="decreases">{t("analytics.decreases_only")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sub-tabs: Supplier View / Product View */}
      <Tabs defaultValue="supplier-view">
        <TabsList>
          <TabsTrigger value="supplier-view" className="gap-1.5 text-xs">
            <Store className="w-3.5 h-3.5" />
            {t("analytics.supplier_view")}
          </TabsTrigger>
          <TabsTrigger value="product-view" className="gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" />
            {t("analytics.product_view")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supplier-view" className="mt-4">
          <SupplierDrilldown priceData={filteredData} suppliers={suppliers} />
        </TabsContent>

        <TabsContent value="product-view" className="mt-4">
          <ProductDrilldown priceData={filteredData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
