import { useMemo } from "react";
import type { SupplierPerformance, PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, AlertCircle, GitBranch, Clock, Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  suppliers: SupplierPerformance[];
  priceData: PriceVolatility[];
}

function InsightCard({ icon, label, value, sub, variant }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  variant: "primary" | "warning" | "success" | "accent";
}) {
  const bgMap = {
    primary: "bg-primary/10 border-primary/20",
    warning: "bg-warning/10 border-warning/20",
    success: "bg-success/10 border-success/20",
    accent: "bg-accent/10 border-accent/20",
  };
  return (
    <Card className={`border ${bgMap[variant]}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StrategicInsights({ suppliers, priceData }: Props) {
  const { t } = useLanguage();

  const insights = useMemo(() => {
    // Leverage Opportunities: dependency > 15%
    const leverageSuppliers = suppliers.filter(s => (s.dependency_pct ?? 0) > 15);

    // Price Alerts: suppliers with high volatility products (proxy for recent price increases)
    const suppliersWithAlerts = new Set(
      priceData.filter(p => p.level === "high" || (p.latest_price > p.avg_price * 1.05)).map(p => p.supplier_name)
    );

    // Alternative Sources: products supplied by 2+ suppliers
    const productSupplierMap: Record<string, Set<string>> = {};
    for (const p of priceData) {
      if (!productSupplierMap[p.product_name]) productSupplierMap[p.product_name] = new Set();
      productSupplierMap[p.product_name].add(p.supplier_name);
    }
    const multiSourceProducts = Object.entries(productSupplierMap).filter(([, s]) => s.size >= 2);

    // Stale Contracts: suppliers with very low invoice count (proxy for inactivity)
    // Since we don't have date data, use invoice_count <= 1 as proxy
    const staleSuppliers = suppliers.filter(s => s.invoice_count <= 1);

    // Generate recommendations
    const recommendations: { text: string; type: "leverage" | "consolidate" | "review" | "alert" }[] = [];

    // Leverage tip
    if (leverageSuppliers.length > 0) {
      const top2 = leverageSuppliers
        .sort((a, b) => (b.dependency_pct ?? 0) - (a.dependency_pct ?? 0))
        .slice(0, 2);
      if (top2.length >= 2) {
        recommendations.push({
          text: t("analytics.rec_leverage_multi")
            .replace("{s1}", top2[0].supplier_name)
            .replace("{s2}", top2[1].supplier_name)
            .replace("{d1}", (top2[0].dependency_pct ?? 0).toFixed(1))
            .replace("{d2}", (top2[1].dependency_pct ?? 0).toFixed(1)),
          type: "leverage",
        });
      } else if (top2.length === 1) {
        recommendations.push({
          text: t("analytics.rec_leverage_single")
            .replace("{s1}", top2[0].supplier_name)
            .replace("{d1}", (top2[0].dependency_pct ?? 0).toFixed(1)),
          type: "leverage",
        });
      }
    }

    // Consolidation tip
    if (multiSourceProducts.length > 0) {
      recommendations.push({
        text: t("analytics.rec_consolidate").replace("{count}", String(multiSourceProducts.length)),
        type: "consolidate",
      });
    }

    // Stale contracts tip
    if (staleSuppliers.length > 0) {
      recommendations.push({
        text: t("analytics.rec_stale").replace("{count}", String(staleSuppliers.length)),
        type: "review",
      });
    }

    // Price alert tip
    if (suppliersWithAlerts.size > 0) {
      const names = Array.from(suppliersWithAlerts).slice(0, 3).join(", ");
      recommendations.push({
        text: t("analytics.rec_price_alert").replace("{suppliers}", names),
        type: "alert",
      });
    }

    return {
      leverageCount: leverageSuppliers.length,
      alertCount: suppliersWithAlerts.size,
      multiSourceCount: multiSourceProducts.length,
      staleCount: staleSuppliers.length,
      recommendations,
    };
  }, [suppliers, priceData, t]);

  const recIcons = {
    leverage: <Handshake className="w-4 h-4 text-primary shrink-0 mt-0.5" />,
    consolidate: <GitBranch className="w-4 h-4 text-success shrink-0 mt-0.5" />,
    review: <Clock className="w-4 h-4 text-warning shrink-0 mt-0.5" />,
    alert: <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />,
  };

  return (
    <div className="space-y-4">
      {/* 4 Strategic Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <InsightCard
          icon={<Handshake className="w-5 h-5 text-primary" />}
          label={t("analytics.leverage_opportunities")}
          value={String(insights.leverageCount)}
          sub={t("analytics.leverage_sub")}
          variant="primary"
        />
        <InsightCard
          icon={<AlertCircle className="w-5 h-5 text-destructive" />}
          label={t("analytics.price_alerts_card")}
          value={String(insights.alertCount)}
          sub={t("analytics.price_alerts_sub")}
          variant="warning"
        />
        <InsightCard
          icon={<GitBranch className="w-5 h-5 text-success" />}
          label={t("analytics.alternative_sources")}
          value={String(insights.multiSourceCount)}
          sub={t("analytics.alternative_sources_sub")}
          variant="success"
        />
        <InsightCard
          icon={<Clock className="w-5 h-5 text-accent" />}
          label={t("analytics.stale_contracts")}
          value={String(insights.staleCount)}
          sub={t("analytics.stale_contracts_sub")}
          variant="accent"
        />
      </div>

      {/* Negotiation Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              {t("analytics.negotiation_tips")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2.5">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  {recIcons[rec.type]}
                  <span>{rec.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
