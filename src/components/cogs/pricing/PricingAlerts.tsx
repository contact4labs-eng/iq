import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, TrendingDown, Truck } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface PricingAlertsProps {
  products: Product[];
  costMap: Map<string, number>;
  platforms: DeliveryPlatform[];
}

interface PriceAlert {
  type: "negative_margin" | "platform_loss" | "no_delivery_price" | "high_food_cost";
  severity: "critical" | "warning";
  product: string;
  detail: { el: string; en: string };
}

export function PricingAlerts({ products, costMap, platforms }: PricingAlertsProps) {
  const { language } = useLanguage();

  const alerts = useMemo(() => {
    const result: PriceAlert[] = [];

    for (const p of products) {
      const cost = costMap.get(p.id) ?? 0;
      if (cost <= 0) continue;

      // Negative or zero margin on dine-in
      if (p.selling_price_dinein > 0 && p.selling_price_dinein <= cost) {
        result.push({
          type: "negative_margin",
          severity: "critical",
          product: p.name,
          detail: {
            el: `Τιμή dine-in (€${p.selling_price_dinein.toFixed(2)}) ≤ κόστος (€${cost.toFixed(2)})`,
            en: `Dine-in price (€${p.selling_price_dinein.toFixed(2)}) ≤ cost (€${cost.toFixed(2)})`,
          },
        });
      }

      // Very high food cost (>50%)
      if (p.selling_price_dinein > 0) {
        const fc = (cost / p.selling_price_dinein) * 100;
        if (fc > 50 && fc <= 100) {
          result.push({
            type: "high_food_cost",
            severity: "warning",
            product: p.name,
            detail: {
              el: `Food cost ${fc.toFixed(0)}% — πάνω από 50% (τιμή: €${p.selling_price_dinein.toFixed(2)}, κόστος: €${cost.toFixed(2)})`,
              en: `Food cost ${fc.toFixed(0)}% — above 50% (price: €${p.selling_price_dinein.toFixed(2)}, cost: €${cost.toFixed(2)})`,
            },
          });
        }
      }

      // Platform losses
      if (p.selling_price_delivery > 0) {
        for (const pl of platforms) {
          const effectiveRevenue = p.selling_price_delivery * (1 - pl.commission_percent / 100);
          if (effectiveRevenue < cost) {
            result.push({
              type: "platform_loss",
              severity: "critical",
              product: p.name,
              detail: {
                el: `Ζημιογόνο στο ${pl.name}: έσοδα €${effectiveRevenue.toFixed(2)} < κόστος €${cost.toFixed(2)}`,
                en: `Loss on ${pl.name}: revenue €${effectiveRevenue.toFixed(2)} < cost €${cost.toFixed(2)}`,
              },
            });
          }
        }
      }

      // Has dine-in but no delivery price and platforms exist
      if (p.selling_price_dinein > 0 && p.selling_price_delivery <= 0 && platforms.length > 0) {
        result.push({
          type: "no_delivery_price",
          severity: "warning",
          product: p.name,
          detail: {
            el: `Δεν έχει τιμή delivery — πιθανή απώλεια εσόδων.`,
            en: `No delivery price set — potential revenue loss.`,
          },
        });
      }
    }

    return result.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
  }, [products, costMap, platforms]);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        {language === "el" ? "Ειδοποιήσεις Τιμών" : "Price Alerts"}
        <span className="text-[10px] text-muted-foreground font-normal">
          ({criticalCount} {language === "el" ? "κρίσιμα" : "critical"}, {warningCount} {language === "el" ? "προειδοποιήσεις" : "warnings"})
        </span>
      </div>

      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {alerts.slice(0, 8).map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs ${
              alert.severity === "critical"
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
            }`}
          >
            {alert.type === "platform_loss" ? (
              <Truck className="w-3 h-3 mt-0.5 shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="font-medium">{alert.product}:</span>{" "}
              {alert.detail[language]}
            </div>
          </div>
        ))}
        {alerts.length > 8 && (
          <p className="text-[10px] text-muted-foreground text-center">
            +{alerts.length - 8} {language === "el" ? "ακόμα" : "more"}...
          </p>
        )}
      </div>
    </div>
  );
}
