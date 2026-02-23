import { useState } from "react";
import { Bell, CheckCircle, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAlerts, type AlertItem } from "@/hooks/useAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

const SEV_KEYS: Record<string, { color: string; bar: string; labelKey: TranslationKey }> = {
  critical: { color: "bg-destructive text-destructive-foreground", bar: "bg-destructive", labelKey: "alerts.critical" },
  high: { color: "bg-warning text-warning-foreground", bar: "bg-warning", labelKey: "alerts.high" },
  medium: { color: "bg-[hsl(50,80%,50%)] text-foreground", bar: "bg-[hsl(50,80%,50%)]", labelKey: "alerts.medium" },
  low: { color: "bg-accent text-accent-foreground", bar: "bg-accent", labelKey: "alerts.low" },
};

const TYPE_KEYS: Record<string, TranslationKey> = {
  price_increase: "alerts.price_increase",
  duplicate_invoice: "alerts.duplicate_invoice",
  missing_field: "alerts.missing_field",
  unusual_amount: "alerts.unusual_amount",
  overdue_payment: "alerts.overdue_payment",
  budget_exceeded: "alerts.budget_exceeded",
};

const Alerts = () => {
  const { summary, alerts, loading, error, resolveAlert, refresh } = useAlerts();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [filterResolved, setFilterResolved] = useState<"all" | "unresolved">("unresolved");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const types = [...new Set(alerts.map((a) => a.alert_type))];

  const filtered = alerts.filter((a) => {
    if (filterResolved === "unresolved" && a.is_resolved) return false;
    if (filterType !== "all" && a.alert_type !== filterType) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    return true;
  });

  const handleResolve = async (id: string) => {
    const result = await resolveAlert(id);
    if (!result.success) toast({ title: t("toast.error"), description: result.message ?? "Unknown error", variant: "destructive" });
    else toast({ title: t("toast.success"), description: t("toast.alert_resolved") });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bell className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.alerts")}</h1>
          </div>
          <p className="text-muted-foreground">{t("alerts.subtitle")}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="flex gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}</div>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            {summary && (
              <div className="flex flex-wrap gap-3">
                {(["critical", "high", "medium", "low"] as const).map((sev) => {
                  const conf = SEV_KEYS[sev];
                  const count = summary[sev] ?? 0;
                  return (
                    <Badge key={sev} className={cn("text-sm px-3 py-1.5 gap-1.5", conf.color)}>
                      {t(conf.labelKey)}: {count}
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterResolved("all")}
                  className={cn("px-3 py-1 rounded-full text-xs border transition-colors",
                    filterResolved === "all" ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border")}
                >
                  {t("alerts.all")}
                </button>
                <button
                  onClick={() => setFilterResolved("unresolved")}
                  className={cn("px-3 py-1 rounded-full text-xs border transition-colors",
                    filterResolved === "unresolved" ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border")}
                >
                  {t("alerts.unresolved")}
                </button>
              </div>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder={t("alerts.severity")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("alerts.all_severities")}</SelectItem>
                  {Object.entries(SEV_KEYS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{t(v.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {types.length > 0 && (
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder={t("alerts.type")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("alerts.all_types")}</SelectItem>
                    {types.map((tp) => (
                      <SelectItem key={tp} value={tp}>{TYPE_KEYS[tp] ? t(TYPE_KEYS[tp]) : tp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">{t("alerts.no_alerts")}</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => {
                  const sev = SEV_KEYS[a.severity] ?? SEV_KEYS.low;
                  return (
                    <Card key={a.id} className={cn("overflow-hidden", a.is_resolved && "opacity-60")}>
                      <div className="flex">
                        <div className={cn("w-1.5 shrink-0", sev.bar)} />
                        <CardContent className="flex-1 p-4 flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{TYPE_KEYS[a.alert_type] ? t(TYPE_KEYS[a.alert_type]) : a.alert_type}</Badge>
                              <Badge className={cn("text-[10px]", sev.color)}>{t(sev.labelKey)}</Badge>
                              {a.is_resolved && <Badge variant="secondary" className="text-[10px]">{t("alerts.resolved")}</Badge>}
                            </div>
                            <p className="font-medium text-sm text-foreground">{a.title}</p>
                            <p className="text-sm text-muted-foreground">{a.message}</p>
                            <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("el-GR")}</p>
                          </div>
                          {!a.is_resolved && (
                            <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => handleResolve(a.id)}>
                              <CheckCircle className="w-3.5 h-3.5" /> {t("alerts.resolve")}
                            </Button>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
