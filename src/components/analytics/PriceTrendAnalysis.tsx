import { useState, useMemo } from "react";
import { Store, Package, Filter, CheckCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { PriceAlertCards } from "./PriceAlertCards";
import { SupplierDrilldown } from "./SupplierDrilldown";
import { ProductDrilldown } from "./ProductDrilldown";
import type { PriceVolatility, SupplierPerformance } from "@/hooks/useInvoiceAnalytics";

type PriceDirection = "all" | "increases" | "decreases";

export function PriceTrendAnalysis({
  priceData,
  suppliers,
}: {
  priceData: PriceVolatility[];
  suppliers: SupplierPerformance[];
}) {
  const { t } = useLanguage();
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

      {/* Empty state when no data at all */}
      {filteredData.length === 0 && (
        <Card className="border border-success/30 bg-success/5">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <CheckCircle className="w-10 h-10 text-success mb-3" />
            <p className="text-sm font-medium text-foreground">{t("analytics.all_prices_stable")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("analytics.all_prices_stable_sub")}</p>
          </CardContent>
        </Card>
      )}

      {/* Sub-tabs: Supplier View / Product View */}
      {filteredData.length > 0 && (
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
      )}
    </div>
  );
}
