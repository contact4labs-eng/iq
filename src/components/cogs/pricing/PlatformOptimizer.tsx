import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Truck, ArrowRight } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface PlatformOptimizerProps {
  products: Product[];
  costMap: Map<string, number>;
  platforms: DeliveryPlatform[];
  targetMarginPct?: number;
}

function roundPrice(price: number): number {
  const base = Math.floor(price);
  const d = price - base;
  if (d <= 0.25) return base;
  if (d <= 0.65) return base + 0.5;
  return base + 0.9;
}

export function PlatformOptimizer({ products, costMap, platforms, targetMarginPct = 60 }: PlatformOptimizerProps) {
  const { language } = useLanguage();

  const optimizedPrices = useMemo(() => {
    if (platforms.length === 0) return [];

    return products
      .filter((p) => (p.selling_price_dinein > 0 || p.selling_price_delivery > 0) && costMap.has(p.id))
      .map((p) => {
        const cost = costMap.get(p.id) || 0;
        if (cost <= 0) return null;

        const platformPrices = platforms.map((pl) => {
          const commission = pl.commission_percent / 100;
          const optimalPrice = roundPrice(cost / ((1 - targetMarginPct / 100) * (1 - commission)));
          const currentPrice = p.selling_price_delivery || p.selling_price_dinein;
          const currentEffective = currentPrice * (1 - commission);
          const currentMargin = ((currentEffective - cost) / currentEffective) * 100;
          const gap = optimalPrice - currentPrice;

          return {
            platform: pl.name,
            commission: pl.commission_percent,
            currentPrice,
            optimalPrice,
            currentMargin,
            gap,
            isUnderpriced: gap > 0.5,
          };
        });

        const hasIssue = platformPrices.some((pp) => pp.isUnderpriced);

        return { name: p.name, category: p.category, cost, platformPrices, hasIssue };
      })
      .filter(Boolean)
      .filter((r) => r!.hasIssue)
      .sort((a, b) => {
        const aMaxGap = Math.max(...a!.platformPrices.map((pp) => pp.gap));
        const bMaxGap = Math.max(...b!.platformPrices.map((pp) => pp.gap));
        return bMaxGap - aMaxGap;
      })
      .slice(0, 10) as NonNullable<typeof optimizedPrices[0]>[];
  }, [products, costMap, platforms, targetMarginPct]);

  if (platforms.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        {language === "el"
          ? "Προσθέστε πλατφόρμες delivery στις ρυθμίσεις."
          : "Add delivery platforms in settings."}
      </div>
    );
  }

  if (optimizedPrices.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        {language === "el"
          ? "Όλες οι τιμές πλατφορμών είναι βελτιστοποιημένες!"
          : "All platform prices are optimized!"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Truck className="w-3.5 h-3.5 text-primary" />
        {language === "el" ? "Βελτιστοποίηση Τιμών Πλατφορμών" : "Platform Price Optimizer"}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {language === "el"
          ? `Προτεινόμενες τιμές για στόχο ${targetMarginPct}% κέρδους μετά προμηθειών.`
          : `Suggested prices for ${targetMarginPct}% margin target after commissions.`}
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {optimizedPrices.map((item, i) => (
          <div key={i} className="rounded-lg border p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{item.name}</span>
              <span className="text-[10px] text-muted-foreground">€{item.cost.toFixed(2)} {language === "el" ? "κόστος" : "cost"}</span>
            </div>
            {item.platformPrices
              .filter((pp) => pp.isUnderpriced)
              .map((pp, j) => (
                <div key={j} className="flex items-center justify-between text-[11px] pl-2">
                  <span className="text-muted-foreground">{pp.platform} ({pp.commission}%)</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-red-500">€{pp.currentPrice.toFixed(2)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-green-600 font-medium">€{pp.optimalPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
