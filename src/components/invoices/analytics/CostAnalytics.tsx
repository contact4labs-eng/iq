import type { CostAnalytics } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const PIE_COLORS = [
  "hsl(207, 90%, 54%)",
  "hsl(152, 56%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 60%, 45%)",
];

function formatCurrency(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v ?? 0);
}

export function CostAnalyticsSection({ data }: { data: CostAnalytics | null }) {
  const { t } = useLanguage();
  if (!data) return null;

  const categories = data.by_category ?? [];
  const trends = data.monthly_trends ?? [];

  const pieConfig: ChartConfig = { total: { label: t("analytics.spend_label") } };
  const barConfig: ChartConfig = { total: { label: t("analytics.spend_label"), color: "hsl(207, 90%, 54%)" } };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("analytics.cost_by_category")}</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <ChartContainer config={pieConfig} className="aspect-square max-h-[300px] mx-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={categories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ category }) => category}>
                  {categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">{t("analytics.no_data")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("analytics.monthly_cost_trend")}</CardTitle>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <ChartContainer config={barConfig} className="aspect-video max-h-[300px]">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="hsl(207, 90%, 54%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">{t("analytics.no_data")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
