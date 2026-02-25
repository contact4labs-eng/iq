import { useLanguage } from "@/contexts/LanguageContext";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/hooks/useProducts";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface PricingExportProps {
  products: Product[];
  costMap: Map<string, number>;
  platforms: DeliveryPlatform[];
}

function marginPct(price: number, cost: number) {
  return price > 0 ? ((price - cost) / price) * 100 : 0;
}

function exportCSV(products: Product[], costMap: Map<string, number>, platforms: DeliveryPlatform[], language: string) {
  const headers = [
    language === "el" ? "Προϊόν" : "Product",
    language === "el" ? "Κατηγορία" : "Category",
    language === "el" ? "Κόστος (€)" : "Cost (€)",
    language === "el" ? "Τιμή Dine-in (€)" : "Dine-in Price (€)",
    language === "el" ? "Κέρδος Dine-in (%)" : "Dine-in Margin (%)",
    language === "el" ? "Τιμή Delivery (€)" : "Delivery Price (€)",
    language === "el" ? "Κέρδος Delivery (%)" : "Delivery Margin (%)",
    language === "el" ? "Food Cost (%)" : "Food Cost (%)",
    ...platforms.map((pl) => `${pl.name} ${language === "el" ? "Κέρδος" : "Margin"} (%)`),
  ];

  const rows = products
    .filter((p) => p.selling_price_dinein > 0 || p.selling_price_delivery > 0)
    .map((p) => {
      const cost = costMap.get(p.id) ?? 0;
      const mDI = marginPct(p.selling_price_dinein, cost);
      const mDL = marginPct(p.selling_price_delivery, cost);
      const foodCost = p.selling_price_dinein > 0 ? (cost / p.selling_price_dinein) * 100 : 0;

      const platformMargins = platforms.map((pl) => {
        const eff = p.selling_price_delivery * (1 - pl.commission_percent / 100);
        return marginPct(eff, cost).toFixed(1);
      });

      return [
        `"${p.name}"`,
        `"${p.category}"`,
        cost.toFixed(2),
        p.selling_price_dinein.toFixed(2),
        mDI.toFixed(1),
        p.selling_price_delivery.toFixed(2),
        mDL.toFixed(1),
        foodCost.toFixed(1),
        ...platformMargins,
      ];
    });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pricing-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PricingExportButton({ products, costMap, platforms }: PricingExportProps) {
  const { language } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5"
      onClick={() => exportCSV(products, costMap, platforms, language)}
    >
      <Download className="w-3 h-3" />
      {language === "el" ? "Εξαγωγή CSV" : "Export CSV"}
    </Button>
  );
}
