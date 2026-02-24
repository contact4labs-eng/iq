import { useState, useMemo } from "react";
import { Bell, CheckCircle, Star, ShieldAlert, Plus, Pencil, Trash2, FileX2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAlerts } from "@/hooks/useAlerts";
import { useCustomAlertRules, type AlertRule, type AlertRuleInsert } from "@/hooks/useCustomAlertRules";
import { AddAlertRuleModal, ALERT_TYPES } from "@/components/alerts/AddAlertRuleModal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const { rules, loading: rulesLoading, addRule, updateRule, deleteRule, toggleRule } = useCustomAlertRules();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);

  const allAlerts = alerts;
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.is_resolved), [alerts]);
  const importantAlerts = useMemo(
    () => alerts.filter((a) => a.severity === "critical" || a.severity === "high"),
    [alerts]
  );

  /* ---- Notification handlers ---- */
  const handleResolve = async (id: string) => {
    const result = await resolveAlert(id);
    if (!result.success) toast({ title: t("toast.error"), description: result.message ?? "Unknown error", variant: "destructive" });
    else toast({ title: t("toast.success"), description: t("toast.alert_resolved") });
  };

  const handleMarkAllRead = async () => {
    const unresolvedIds = unreadAlerts.map((a) => a.id);
    let failCount = 0;
    for (const id of unresolvedIds) {
      const result = await resolveAlert(id);
      if (!result.success) failCount++;
    }
    if (failCount > 0) {
      toast({ title: t("toast.error"), description: `${failCount} notifications failed`, variant: "destructive" });
    } else {
      toast({ title: t("toast.success"), description: t("toast.alert_resolved") });
    }
  };

  /* ---- Alert rules handlers ---- */
  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (rule: AlertRule) => {
    setEditing(rule);
    setModalOpen(true);
  };

  const handleRuleSave = async (data: AlertRuleInsert) => {
    if (editing) return updateRule(editing.id, data);
    return addRule(data);
  };

  const handleRuleDelete = async (id: string) => {
    const result = await deleteRule(id);
    if (result.success) {
      toast({ title: t("toast.success"), description: t("alert_rules.success_delete") });
    } else {
      toast({ title: t("toast.error"), description: result.message ?? "Error", variant: "destructive" });
    }
  };

  const handleRuleToggle = async (id: string, enabled: boolean) => {
    const result = await toggleRule(id, enabled);
    if (result.success) {
      toast({ title: t("toast.success"), description: t("alert_rules.success_toggle") });
    } else {
      toast({ title: t("toast.error"), description: result.message ?? "Error", variant: "destructive" });
    }
  };

  const typeLabel = (alertType: string): string => {
    const def = ALERT_TYPES.find((td) => td.value === alertType);
    return def ? t(def.labelKey) : alertType;
  };

  const fmt = (n: number) =>
    n.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isSmartRule = (rule: AlertRule) => {
    const cfg = rule.config as Record<string, unknown> | null;
    return cfg?.mode === "smart";
  };

  const isFuturePayment = (rule: AlertRule) => {
    const cfg = rule.config as Record<string, unknown> | null;
    return cfg?.mode === "future_payment";
  };

  const smartDesc = (rule: AlertRule): string => {
    const cfg = rule.config as Record<string, unknown> | null;
    if (!cfg) return "";
    const pct = cfg.percent != null ? cfg.percent : rule.threshold_value;
    const dir = cfg.direction === "above"
      ? t("alert_rules.smart_label_above")
      : t("alert_rules.smart_label_below");
    return `${pct}% ${dir}`;
  };

  const paymentDesc = (rule: AlertRule): string => {
    const cfg = rule.config as Record<string, unknown> | null;
    if (!cfg) return "";
    const parts: string[] = [];
    if (cfg.description) parts.push(String(cfg.description));
    if (rule.threshold_value != null) parts.push(`${fmt(rule.threshold_value)} €`);
    if (cfg.due_date) parts.push(`${t("alert_rules.payment_due")}: ${String(cfg.due_date)}`);
    if (cfg.recurring === "monthly") parts.push(`(${t("alert_rules.payment_recurring_monthly")})`);
    return parts.join(" · ");
  };

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.enabled).length;

  /* ---- Render helpers ---- */
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

  const renderRulesList = () => {
    if (rulesLoading) {
      return (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
      );
    }

    if (totalRules === 0) {
      return (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <FileX2 className="w-12 h-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">{t("alert_rules.no_rules")}</h3>
            <p className="text-sm text-muted-foreground">{t("alert_rules.no_rules_desc")}</p>
            <Button onClick={openAdd} variant="outline" className="mt-2 gap-2">
              <Plus className="w-4 h-4" />
              {t("alert_rules.add")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {/* Summary + Add button */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalRules} {t("alert_rules.rules_count")} · {activeRules} {t("alert_rules.active_count")}
          </span>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            {t("alert_rules.add")}
          </Button>
        </div>

        {/* Rules list */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-opacity",
                    !rule.enabled && "opacity-50"
                  )}
                >
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(val) => handleRuleToggle(rule.id, val)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {typeLabel(rule.alert_type)}
                      </span>
                      {isSmartRule(rule) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          SMART
                        </span>
                      )}
                      {isFuturePayment(rule) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          {t("alert_rules.payment_badge")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                      {isFuturePayment(rule) ? (
                        <span>{paymentDesc(rule)}</span>
                      ) : isSmartRule(rule) ? (
                        <span>{smartDesc(rule)}</span>
                      ) : (
                        rule.threshold_value != null && (
                          <span>{t("alert_rules.threshold")}: {fmt(rule.threshold_value)} €</span>
                        )
                      )}
                      {rule.notes && (
                        <span className="truncate max-w-[250px]">· {rule.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(rule)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {typeLabel(rule.alert_type)}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("alert_rules.confirm_delete")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("modal.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleRuleDelete(rule.id)}
                          >
                            {t("modal.save")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              <TabsTrigger value="rules" className="gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                {t("alert_rules.title")}
                <Badge variant="secondary" className="ml-1 text-[10px]">{totalRules}</Badge>
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
            <TabsContent value="rules" className="mt-4">
              {renderRulesList()}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AddAlertRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleRuleSave}
        editing={editing}
      />
    </DashboardLayout>
  );
};

export default NotificationsPage;
