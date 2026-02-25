import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Truck, TrendingUp, ArrowRight } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface DeliverySuggestionsProps {
  products: Product[];
  costMap: Map<string, number>;
  platforms: DeliveryPlatform[];
}

function roundPrice(price: number): number {
  const base = Math.floor(price);
  const d = price - base;
  if (d <= 0.25) return base;
  if (d <= 0.65) return base + 0.5;
  return base + 0.9;
}

export function DeliverySuggestions({ products, costMap, platforms }: DeliverySuggestionsProps) {
  const { language } = useLanguage();

  const suggestions = useMemo(() => {
    if (platforms.length === 0) return [];

    const avgCommission = platforms.reduce((s, p) => s + p.commission_percent, 0) / platforms.length / 100;

    return products
      .filter((p) => {
        const cost = costMap.get(p.id) ?? 0;
        return cost > 0 && p.selling_price_dinein > 0;
      })
      .map((p) => {
        const cost = costMap.get(p.id) || 0;
        const dineinMargin = ((p.selling_price_dinein - cost) / p.selling_price_dinein) * 100;

        // Calculate if the product is still profitable after avg commission
        const deliveryPrice = p.selling_price_delivery > 0 ? p.selling_price_delivery : p.selling_price_dinein;
        const effectiveRevenue = deliveryPrice * (1 - avgCommission);
        const deliveryMargin = ((effectiveRevenue - cost) / deliveryPrice) * 100;

        // Suggested delivery price for 50% margin after commission
        const suggestedPrice = roundPrice(cost / ((1 - avgCommission) * 0.5));

        // Score: high dine-in margin + low cost = good for delivery
        const score = dineinMargin - (cost * 10);

        return {
          name: p.name,
          category: p.category,
          cost,
          dineinMargin,
          deliveryMargin,
          hasDeliveryPrice: p.selling_price_delivery > 0,
          currentDeliveryPrice: p.selling_price_delivery,
          suggestedPrice,
          score,
        };
      })
      .filter((p) => p.dineinMargin >= 50) // Only products with good base margin
      .sort((a, b) => b.dineinMargin - a.dineinMargin)
      .slice(0, 8);
  }, [products, costMap, platforms]);

  if (platforms.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        {language === "el"
          ? "Προσθέστε πλατφόρμες delivery για προτάσεις."
          : "Add delivery platforms for suggestions."}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Truck className="w-3.5 h-3.5 text-primary" />
        {language === "el" ? "Προτάσεις Delivery Menu" : "Delivery Menu Suggestions"}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {language === "el"
          ? "Προϊόντα με υψηλό περιθώριο, ιδανικά για delivery-only menu."
          : "High-margin products ideal for a delivery-only menu."}
      </p>

      <div className="rounded-lg border divide-y max-h-44 overflow-y-auto">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
            <div className="min-w-0 flex-1 mr-2">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {s.category} · {language === "el" ? "Κέρδος" : "Margin"}: {s.dineinMargin.toFixed(0)}%
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!s.hasDeliveryPrice ? (
                <span className="text-[10px] text-amber-600">
                  → €{s.suggestedPrice.toFixed(2)}
                </span>
              ) : (
                <span className="text-[10px] text-green-600">
                  €{s.currentDeliveryPrice.toFixed(2)}
                </span>
              )}
              <TrendingUp className="w-3 h-3 text-green-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
