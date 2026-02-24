import { AlertTriangle, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PriceVolatility } from "@/hooks/useInvoiceAnalytics";

interface PriceAlert {
  product_name: string;
  supplier_name: string;
  old_price: number;
  new_price: number;
  pct_change: number;
}

function derivePriceAlerts(data: PriceVolatility[]): PriceAlert[] {
  return data
    .filter((p) => {
      if (p.avg_price === 0) return false;
      const pctChange = ((p.latest_price - p.avg_price) / p.avg_price) * 100;
      return pctChange > 5;
    })
    .map((p) => ({
      product_name: p.product_name,
      supplier_name: p.supplier_name,
      old_price: p.avg_price,
      new_price: p.latest_price,
      pct_change: ((p.latest_price - p.avg_price) / p.avg_price) * 100,
    }))
    .sort((a, b) => b.pct_change - a.pct_change);
}

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

export function PriceAlertCards({ data }: { data: PriceVolatility[] }) {
  const { t } = useLanguage();
  const alerts = derivePriceAlerts(data);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-success" />
        <p className="text-sm text-foreground">{t("analytics.no_price_alerts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">{t("analytics.price_alerts")}</h3>
        <Badge variant="destructive" className="text-[10px]">{alerts.length}</Badge>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.slice(0, 6).map((alert, i) => (
          <Card key={i} className="border border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{alert.product_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.supplier_name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-bold text-destructive">+{alert.pct_change.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{fmt(alert.old_price)}</span>
                <TrendingUp className="w-3 h-3 text-destructive" />
                <span className="font-medium text-destructive">{fmt(alert.new_price)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
