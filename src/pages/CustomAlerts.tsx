import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import {
  useCustomAlertRules,
  type AlertRule,
  type AlertRuleInsert,
} from "@/hooks/useCustomAlertRules";
import {
  AddAlertRuleModal,
  ALL_TYPES,
  CATEGORY_TYPES,
} from "@/components/alerts/AddAlertRuleModal";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import {
  ShieldAlert,
  Plus,
  Pencil,
  Trash2,
  ShoppingCart,
  Users,
  Sparkles,
  FileX2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Category config                                                   */
/* ------------------------------------------------------------------ */

const CATEGORIES: {
  key: string;
  labelKey: TranslationKey;
  icon: typeof ShoppingCart;
  color: string;
}[] = [
  { key: "sales", labelKey: "alert_rules.cat_sales", icon: ShoppingCart, color: "text-blue-500" },
  { key: "customer", labelKey: "alert_rules.cat_customer", icon: Users, color: "text-green-500" },
  { key: "smart", labelKey: "alert_rules.cat_smart", icon: Sparkles, color: "text-amber-500" },
];

const SEV_COLORS: Record<string, string> = {
  low: "bg-accent text-accent-foreground",
  medium: "bg-[hsl(50,80%,50%)] text-foreground",
  high: "bg-warning text-warning-foreground",
  critical: "bg-destructive text-destructive-foreground",
};

const SEV_LABELS: Record<string, TranslationKey> = {
  low: "alert_rules.sev_low",
  medium: "alert_rules.sev_medium",
  high: "alert_rules.sev_high",
  critical: "alert_rules.sev_critical",
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

function CustomAlerts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { rules, loading, addRule, updateRule, deleteRule, toggleRule } =
    useCustomAlertRules();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (rule: AlertRule) => {
    setEditing(rule);
    setModalOpen(true);
  };

  const handleSave = async (data: AlertRuleInsert) => {
    if (editing) {
      return updateRule(editing.id, data);
    }
    return addRule(data);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteRule(id);
    if (result.success) {
      toast({ title: t("toast.success"), description: t("alert_rules.success_delete") });
    } else {
      toast({
        title: t("toast.error"),
        description: result.message ?? "Error",
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const result = await toggleRule(id, enabled);
    if (result.success) {
      toast({ title: t("toast.success"), description: t("alert_rules.success_toggle") });
    } else {
      toast({
        title: t("toast.error"),
        description: result.message ?? "Error",
        variant: "destructive",
      });
    }
  };

  const typeLabel = (alertType: string): string => {
    const def = ALL_TYPES.find((td) => td.type === alertType);
    return def ? t(def.labelKey) : alertType;
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.enabled).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              {t("alert_rules.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("alert_rules.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalRules} {t("alert_rules.rules_count")} &middot; {activeRules} {t("alert_rules.active_count")}
            </span>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("alert_rules.add")}
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </CardContent>
          </Card>
        ) : totalRules === 0 ? (
          /* Global empty state */
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
              <FileX2 className="w-12 h-12 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold">{t("alert_rules.no_rules")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("alert_rules.no_rules_desc")}
              </p>
              <Button onClick={openAdd} variant="outline" className="mt-2 gap-2">
                <Plus className="w-4 h-4" />
                {t("alert_rules.add")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Category sections */
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const catRules = rules.filter((r) => r.category === cat.key);
              const isCollapsed = collapsed[cat.key];
              const CatIcon = cat.icon;

              return (
                <Card key={cat.key}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCollapse(cat.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CatIcon className={cn("w-5 h-5", cat.color)} />
                      <span className="font-semibold">{t(cat.labelKey)}</span>
                      <Badge variant="outline" className="text-xs">
                        {catRules.length}
                      </Badge>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Rules list */}
                  {!isCollapsed && (
                    <CardContent className="p-0 border-t">
                      {catRules.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          {t("alert_rules.no_rules")}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {catRules.map((rule) => (
                            <div
                              key={rule.id}
                              className={cn(
                                "flex items-center gap-4 px-4 py-3 transition-opacity",
                                !rule.enabled && "opacity-50"
                              )}
                            >
                              {/* Toggle */}
                              <Switch
                                checked={rule.enabled}
                                onCheckedChange={(val) => handleToggle(rule.id, val)}
                              />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {typeLabel(rule.alert_type)}
                                  </span>
                                  <Badge
                                    className={cn(
                                      "text-[10px]",
                                      SEV_COLORS[rule.severity] ?? SEV_COLORS.medium
                                    )}
                                  >
                                    {t(SEV_LABELS[rule.severity] ?? SEV_LABELS.medium)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                                  {rule.threshold_value != null && (
                                    <span>
                                      {t("alert_rules.threshold")}: {rule.threshold_value}
                                      {rule.threshold_unit ? ` ${rule.threshold_unit}` : ""}
                                    </span>
                                  )}
                                  {rule.comparison_period && (
                                    <span>&middot; {rule.comparison_period}</span>
                                  )}
                                  {rule.notes && (
                                    <span className="truncate max-w-[200px]">
                                      &middot; {rule.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
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
                                      <AlertDialogCancel>
                                        {t("modal.cancel")}
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleDelete(rule.id)}
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
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddAlertRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        editing={editing}
      />
    </DashboardLayout>
  );
}

export default CustomAlerts;
