import type { CostAnalytics } from "@/hooks/useInvoiceAnalytics";
import type { SupplierPerformance } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ANALYTICS_COLORS, CHART_TOOLTIP_STYLE, formatCurrencyShort, formatMonth } from "@/components/analytics/constants";

export function CostAnalyticsSection({
  data,
  suppliers,
}: {
  data: CostAnalytics | null;
  suppliers?: SupplierPerformance[];
}) {
  const { t } = useLanguage();
  if (!data) return null;

  // Use by_category if available, otherwise derive from suppliers
  let categories = data.by_category ?? [];
  if (categories.length === 0 && suppliers && suppliers.length > 0) {
    categories = suppliers
      .filter((s) => s.total_spend > 0)
      .map((s) => ({ category: s.supplier_name, total: s.total_spend }))
      .sort((a, b) => b.total - a.total);
  }
  const trends = data.monthly_trends ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-accent" />
            {t("analytics.cost_by_category")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <div className="flex justify-center">
              <div className="w-full max-w-[320px] h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={45}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, name: string) => [formatCurrencyShort(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PieIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{t("analytics.no_data")}</p>
            </div>
          )}
          {/* Legend below */}
          {categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
              {categories.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ANALYTICS_COLORS[i % ANALYTICS_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate max-w-[120px]">{c.category}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            {t("analytics.monthly_cost_trend")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trends} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 10 }}
                  className="text-xs"
                />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10 }} className="text-xs" />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={formatMonth}
                  formatter={(value: number) => [formatCurrencyShort(value), t("analytics.spend_label")]}
                />
                <Bar dataKey="total" fill={ANALYTICS_COLORS[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{t("analytics.no_data")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
