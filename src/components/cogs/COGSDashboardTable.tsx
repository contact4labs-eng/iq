import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

interface COGSDashboardTableProps {
  products: Product[];
  costMap: Map<string, number>;
  getMarginColor: (category: string, marginPercent: number) => "green" | "yellow" | "red";
}

const colorClasses: Record<string, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function COGSDashboardTable({ products, costMap, getMarginColor }: COGSDashboardTableProps) {
  const { t } = useLanguage();

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("cogs.no_products")}
      </div>
    );
  }

  const marginPercent = (sellingPrice: number, cost: number): number => {
    if (sellingPrice <= 0) return 0;
    return ((sellingPrice - cost) / sellingPrice) * 100;
  };

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-2.5 font-semibold">{t("cogs.col_product")}</th>
            <th className="text-left px-4 py-2.5 font-semibold">{t("cogs.product_category")}</th>
            <th className="text-right px-4 py-2.5 font-semibold">{t("cogs.col_cost")}</th>
            <th className="text-right px-4 py-2.5 font-semibold">{t("cogs.col_dinein")}</th>
            <th className="text-center px-4 py-2.5 font-semibold">{t("cogs.col_margin_dinein")}</th>
            <th className="text-right px-4 py-2.5 font-semibold">{t("cogs.col_delivery")}</th>
            <th className="text-center px-4 py-2.5 font-semibold">{t("cogs.col_margin_delivery")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map((product) => {
            const cost = costMap.get(product.id) ?? 0;
            const mDinein = marginPercent(product.selling_price_dinein, cost);
            const mDelivery = marginPercent(product.selling_price_delivery, cost);
            const colorDinein = product.selling_price_dinein > 0 ? getMarginColor(product.category, mDinein) : "red";
            const colorDelivery = product.selling_price_delivery > 0 ? getMarginColor(product.category, mDelivery) : "red";

            return (
              <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">{product.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{product.category}</td>
                <td className="px-4 py-2.5 text-right font-mono">€{cost.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {product.selling_price_dinein > 0 ? `€${product.selling_price_dinein.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {product.selling_price_dinein > 0 ? (
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colorClasses[colorDinein])}>
                      {mDinein.toFixed(1)}%
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {product.selling_price_delivery > 0 ? `€${product.selling_price_delivery.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {product.selling_price_delivery > 0 ? (
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colorClasses[colorDelivery])}>
                      {mDelivery.toFixed(1)}%
                    </span>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
