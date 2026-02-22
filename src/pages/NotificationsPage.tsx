import { useState, useMemo } from "react";
import { Bell, CheckCircle, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAlerts } from "@/hooks/useAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const NotificationsPage = () => {
  const { alerts, loading, error, resolveAlert } = useAlerts();
  const { toast } = useToast();
  const { t } = useLanguage();

  const allAlerts = alerts;
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.is_resolved), [alerts]);
  const importantAlerts = useMemo(
    () => alerts.filter((a) => a.severity === "critical" || a.severity === "high"),
    [alerts]
  );

  const handleResolve = async (id: string) => {
    const err = await resolveAlert(id);
    if (err) toast({ title: t("toast.error"), description: err.message, variant: "destructive" });
    else toast({ title: t("toast.success"), description: t("toast.alert_resolved") });
  };

  const handleMarkAllRead = async () => {
    const unresolvedIds = unreadAlerts.map((a) => a.id);
    let failCount = 0;
    for (const id of unresolvedIds) {
      const err = await resolveAlert(id);
      if (err) failCount++;
    }
    if (failCount > 0) {
      toast({ title: t("toast.error"), description: `${failCount} \u03B5\u03B9\u03B4\u03BF\u03C0\u03BF\u03B9\u03AE\u03C3\u03B5\u03B9\u03C2 \u03B4\u03B5\u03BD \u03B5\u03C0\u03B9\u03BB\u03CD\u03B8\u03B7\u03BA\u03B1\u03BD`, variant: "destructive" });
    } else {
      toast({ title: t("toast.success"), description: t("toast.alert_resolved") });
    }
  };

  const renderAlertList = (list: typeof alerts) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t("notifications.no_notifications")}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {list.map((a) => {
          const sev = SEV_KEYS[a.severity] ?? SEV_KEYS.low;
          return (
            <Card key={a.id} className={cn("overflow-hidden", a.is_resolved && "opacity-60")}>
              <div className="flex">
                <div className={cn("w-1.5 shrink-0", sev.bar)} />
                <CardContent className="flex-1 p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_KEYS[a.alert_type] ? t(TYPE_KEYS[a.alert_type]) : a.alert_type}
                      </Badge>
                      <Badge className={cn("text-[10px]", sev.color)}>{t(sev.labelKey)}</Badge>
                      {a.is_resolved && (
                        <Badge variant="secondary" className="text-[10px]">{t("alerts.resolved")}</Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm text-foreground">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("el-GR")}
                    </p>
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
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bell className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">
              {t("notifications.title")}
            </h1>
          </div>
          <p className="text-muted-foreground">{t("notifications.subtitle")}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 rounded-lg" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                <Bell className="w-4 h-4" />
                {t("notifications.tab_all")}
                <Badge variant="secondary" className="ml-1 text-[10px]">{allAlerts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" className="gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {t("notifications.tab_unread")}
                <Badge variant="secondary" className="ml-1 text-[10px]">{unreadAlerts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="important" className="gap-1.5">
                <Star className="w-4 h-4" />
                {t("notifications.tab_important")}
                <Badge variant="secondary" className="ml-1 text-[10px]">{importantAlerts.length}</Badge>
              </TabsTrigger>
            </TabsList>
            {unreadAlerts.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleMarkAllRead}>
                <CheckCircle className="w-3.5 h-3.5" />
                {t("notifications.mark_all_read")}
              </Button>
            )}
            </div>

            <TabsContent value="all" className="mt-4">
              {renderAlertList(allAlerts)}
            </TabsContent>
            <TabsContent value="unread" className="mt-4">
              {renderAlertList(unreadAlerts)}
            </TabsContent>
            <TabsContent value="important" className="mt-4">
              {renderAlertList(importantAlerts)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
