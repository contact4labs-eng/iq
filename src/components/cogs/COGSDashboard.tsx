import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Package,
  DollarSign, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import type { Ingredient } from "@/hooks/useIngredients";

interface COGSDashboardProps {
  products: Product[];
  ingredients: Ingredient[];
  costMap: Map<string, number>;
  getMarginColor: (category: string, marginPercent: number) => "green" | "yellow" | "red";
}

const COLORS = {
  green: "hsl(152, 56%, 45%)",
  yellow: "hsl(38, 92%, 50%)",
  red: "hsl(0, 72%, 51%)",
};

const colorClasses: Record<string, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function marginPercent(sellingPrice: number, cost: number): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
}

export function COGSDashboard({ products, ingredients, costMap, getMarginColor }: COGSDashboardProps) {
  const { t } = useLanguage();

  const analytics = useMemo(() => {
    // Product margin data
    const productData = products.map((p) => {
      const cost = costMap.get(p.id) ?? 0;
      const mDinein = marginPercent(p.selling_price_dinein, cost);
      const mDelivery = marginPercent(p.selling_price_delivery, cost);
      const colorDinein = p.selling_price_dinein > 0 ? getMarginColor(p.category, mDinein) : "red";
      const colorDelivery = p.selling_price_delivery > 0 ? getMarginColor(p.category, mDelivery) : "red";
      return { ...p, cost, mDinein, mDelivery, colorDinein, colorDelivery };
    });

    // KPI: Average margin (dine-in, only products with price > 0)
    const withDinein = productData.filter((p) => p.selling_price_dinein > 0);
    const avgMarginDinein = withDinein.length > 0
      ? withDinein.reduce((sum, p) => sum + p.mDinein, 0) / withDinein.length
      : 0;

    // KPI: Average margin (delivery)
    const withDelivery = productData.filter((p) => p.selling_price_delivery > 0);
    const avgMarginDelivery = withDelivery.length > 0
      ? withDelivery.reduce((sum, p) => sum + p.mDelivery, 0) / withDelivery.length
      : 0;

    // KPI: Products at risk (red margin on either channel)
    const atRisk = productData.filter((p) => p.colorDinein === "red" || p.colorDelivery === "red");

    // KPI: Total ingredient cost (sum all ingredient prices)
    const totalIngredientValue = ingredients.reduce((sum, ing) => sum + (ing.price_per_unit ?? 0), 0);

    // Margin distribution (dine-in): green / yellow / red counts
    const distribution = { green: 0, yellow: 0, red: 0 };
    for (const p of productData) {
      if (p.selling_price_dinein > 0) {
        distribution[p.colorDinein as keyof typeof distribution]++;
      }
    }

    // Category breakdown: avg margin by category
    const categoryMap = new Map<string, { margins: number[]; count: number }>();
    for (const p of productData) {
      if (p.selling_price_dinein <= 0) continue;
      const cat = p.category || t("cogs.uncategorized");
      if (!categoryMap.has(cat)) categoryMap.set(cat, { margins: [], count: 0 });
      const entry = categoryMap.get(cat)!;
      entry.margins.push(p.mDinein);
      entry.count++;
    }
    const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => {
      const avg = data.margins.reduce((s, m) => s + m, 0) / data.margins.length;
      return { name, avgMargin: Math.round(avg * 10) / 10, count: data.count };
    }).sort((a, b) => b.avgMargin - a.avgMargin);

    // Top 5 highest-cost products
    const highestCost = [...productData]
      .filter((p) => p.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Lowest margin products (at risk, sorted by margin ascending)
    const lowestMargin = [...productData]
      .filter((p) => p.selling_price_dinein > 0)
      .sort((a, b) => a.mDinein - b.mDinein)
      .slice(0, 5);

    return {
      productData,
      avgMarginDinein,
      avgMarginDelivery,
      atRisk,
      totalIngredientValue,
      distribution,
      categoryData,
      highestCost,
      lowestMargin,
    };
  }, [products, ingredients, costMap, getMarginColor, t]);

  const distributionData = [
    { name: t("cogs.dash_healthy"), value: analytics.distribution.green, color: COLORS.green },
    { name: t("cogs.dash_warning"), value: analytics.distribution.yellow, color: COLORS.yellow },
    { name: t("cogs.dash_critical"), value: analytics.distribution.red, color: COLORS.red },
  ].filter((d) => d.value > 0);

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("cogs.no_products")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("cogs.dash_total_products")}</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("cogs.dash_avg_margin")}</p>
                <p className="text-2xl font-bold">{analytics.avgMarginDinein.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                analytics.atRisk.length > 0
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-green-100 dark:bg-green-900/30"
              )}>
                {analytics.atRisk.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("cogs.dash_at_risk")}</p>
                <p className="text-2xl font-bold">{analytics.atRisk.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("cogs.dash_ingredients")}</p>
                <p className="text-2xl font-bold">{ingredients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Margin Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("cogs.dash_margin_distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {distributionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} ${t("cogs.dash_products_label")}`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">{t("cogs.dash_no_data")}</p>
            )}
          </CardContent>
        </Card>

        {/* Category Average Margin Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("cogs.dash_margin_by_category")}</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, t("cogs.dash_avg_margin")]} />
                  <Bar dataKey="avgMargin" radius={[0, 4, 4, 0]}>
                    {analytics.categoryData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.avgMargin >= 65 ? COLORS.green : entry.avgMargin >= 45 ? COLORS.yellow : COLORS.red}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">{t("cogs.dash_no_data")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lowest Margin Products */}
      {analytics.lowestMargin.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              {t("cogs.dash_lowest_margin")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-semibold">{t("cogs.col_product")}</th>
                    <th className="text-left px-4 py-2 font-semibold">{t("cogs.product_category")}</th>
                    <th className="text-right px-4 py-2 font-semibold">{t("cogs.col_cost")}</th>
                    <th className="text-right px-4 py-2 font-semibold">{t("cogs.col_dinein")}</th>
                    <th className="text-center px-4 py-2 font-semibold">{t("cogs.col_margin_dinein")}</th>
                    <th className="text-right px-4 py-2 font-semibold">{t("cogs.col_delivery")}</th>
                    <th className="text-center px-4 py-2 font-semibold">{t("cogs.col_margin_delivery")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analytics.lowestMargin.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-2 text-right font-mono">€{p.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {p.selling_price_dinein > 0 ? `€${p.selling_price_dinein.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {p.selling_price_dinein > 0 ? (
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colorClasses[p.colorDinein])}>
                            {p.mDinein.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {p.selling_price_delivery > 0 ? `€${p.selling_price_delivery.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {p.selling_price_delivery > 0 ? (
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colorClasses[p.colorDelivery])}>
                            {p.mDelivery.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Products Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("cogs.dash_all_products")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
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
                {analytics.productData.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono">€{p.cost.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {p.selling_price_dinein > 0 ? `€${p.selling_price_dinein.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.selling_price_dinein > 0 ? (
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colorClasses[p.colorDinein])}>
                          {p.mDinein.toFixed(1)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {p.selling_price_delivery > 0 ? `€${p.selling_price_delivery.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.selling_price_delivery > 0 ? (
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colorClasses[p.colorDelivery])}>
                          {p.mDelivery.toFixed(1)}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
