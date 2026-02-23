import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import type { AlertRule, AlertRuleInsert } from "@/hooks/useCustomAlertRules";

/* ------------------------------------------------------------------ */
/*  Alert type definitions                                            */
/* ------------------------------------------------------------------ */

export interface AlertTypeDef {
  type: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  defaultSeverity: string;
  defaultUnit: string;
  needsThreshold: boolean;
}

const SALES_TYPES: AlertTypeDef[] = [
  { type: "daily_sales_below", labelKey: "alert_rules.type_daily_sales_below", descKey: "alert_rules.desc_daily_sales_below", defaultSeverity: "high", defaultUnit: "%", needsThreshold: true },
  { type: "transaction_count_drop", labelKey: "alert_rules.type_transaction_count_drop", descKey: "alert_rules.desc_transaction_count_drop", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "aov_drop", labelKey: "alert_rules.type_aov_drop", descKey: "alert_rules.desc_aov_drop", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "refunds_spike", labelKey: "alert_rules.type_refunds_spike", descKey: "alert_rules.desc_refunds_spike", defaultSeverity: "high", defaultUnit: "%", needsThreshold: true },
  { type: "top_product_drop", labelKey: "alert_rules.type_top_product_drop", descKey: "alert_rules.desc_top_product_drop", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "excess_discounting", labelKey: "alert_rules.type_excess_discounting", descKey: "alert_rules.desc_excess_discounting", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
];

const CUSTOMER_TYPES: AlertTypeDef[] = [
  { type: "repeat_rate_drop", labelKey: "alert_rules.type_repeat_rate_drop", descKey: "alert_rules.desc_repeat_rate_drop", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "no_returning", labelKey: "alert_rules.type_no_returning", descKey: "alert_rules.desc_no_returning", defaultSeverity: "high", defaultUnit: "days", needsThreshold: true },
  { type: "high_churn", labelKey: "alert_rules.type_high_churn", descKey: "alert_rules.desc_high_churn", defaultSeverity: "high", defaultUnit: "days", needsThreshold: true },
  { type: "negative_review", labelKey: "alert_rules.type_negative_review", descKey: "alert_rules.desc_negative_review", defaultSeverity: "critical", defaultUnit: "stars", needsThreshold: true },
  { type: "review_volume_drop", labelKey: "alert_rules.type_review_volume_drop", descKey: "alert_rules.desc_review_volume_drop", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "slow_response", labelKey: "alert_rules.type_slow_response", descKey: "alert_rules.desc_slow_response", defaultSeverity: "high", defaultUnit: "hours", needsThreshold: true },
];

const SMART_TYPES: AlertTypeDef[] = [
  { type: "weekday_anomaly", labelKey: "alert_rules.type_weekday_anomaly", descKey: "alert_rules.desc_weekday_anomaly", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "conversion_mismatch", labelKey: "alert_rules.type_conversion_mismatch", descKey: "alert_rules.desc_conversion_mismatch", defaultSeverity: "high", defaultUnit: "%", needsThreshold: true },
  { type: "demand_spike_prep", labelKey: "alert_rules.type_demand_spike_prep", descKey: "alert_rules.desc_demand_spike_prep", defaultSeverity: "medium", defaultUnit: "%", needsThreshold: true },
  { type: "review_theme", labelKey: "alert_rules.type_review_theme", descKey: "alert_rules.desc_review_theme", defaultSeverity: "medium", defaultUnit: "count", needsThreshold: true },
  { type: "top_customer_inactivity", labelKey: "alert_rules.type_top_customer_inactivity", descKey: "alert_rules.desc_top_customer_inactivity", defaultSeverity: "high", defaultUnit: "days", needsThreshold: true },
];

export const CATEGORY_TYPES: Record<string, AlertTypeDef[]> = {
  sales: SALES_TYPES,
  customer: CUSTOMER_TYPES,
  smart: SMART_TYPES,
};

export const ALL_TYPES = [...SALES_TYPES, ...CUSTOMER_TYPES, ...SMART_TYPES];

const CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: "sales", labelKey: "alert_rules.cat_sales" },
  { value: "customer", labelKey: "alert_rules.cat_customer" },
  { value: "smart", labelKey: "alert_rules.cat_smart" },
];

const SEVERITIES: { value: string; labelKey: TranslationKey }[] = [
  { value: "low", labelKey: "alert_rules.sev_low" },
  { value: "medium", labelKey: "alert_rules.sev_medium" },
  { value: "high", labelKey: "alert_rules.sev_high" },
  { value: "critical", labelKey: "alert_rules.sev_critical" },
];

const PERIODS: { value: string; labelKey: TranslationKey }[] = [
  { value: "daily", labelKey: "alert_rules.period_daily" },
  { value: "weekly", labelKey: "alert_rules.period_weekly" },
  { value: "monthly", labelKey: "alert_rules.period_monthly" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: AlertRuleInsert) => Promise<{ success: boolean; message?: string }>;
  editing?: AlertRule | null;
}

export function AddAlertRuleModal({ open, onOpenChange, onSave, editing }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [category, setCategory] = useState("sales");
  const [alertType, setAlertType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [enabled, setEnabled] = useState(true);
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdUnit, setThresholdUnit] = useState("%");
  const [comparisonPeriod, setComparisonPeriod] = useState("daily");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setCategory(editing.category);
      setAlertType(editing.alert_type);
      setSeverity(editing.severity);
      setEnabled(editing.enabled);
      setThresholdValue(editing.threshold_value != null ? String(editing.threshold_value) : "");
      setThresholdUnit(editing.threshold_unit ?? "%");
      setComparisonPeriod(editing.comparison_period ?? "daily");
      setNotes(editing.notes ?? "");
    } else {
      resetForm();
    }
  }, [editing, open]);

  const resetForm = () => {
    setCategory("sales");
    setAlertType("");
    setSeverity("medium");
    setEnabled(true);
    setThresholdValue("");
    setThresholdUnit("%");
    setComparisonPeriod("daily");
    setNotes("");
  };

  const typesForCategory = CATEGORY_TYPES[category] ?? [];
  const selectedTypeDef = ALL_TYPES.find((td) => td.type === alertType);

  // When category changes, auto-select first type
  useEffect(() => {
    if (!editing) {
      const types = CATEGORY_TYPES[category] ?? [];
      if (types.length > 0) {
        setAlertType(types[0].type);
        setSeverity(types[0].defaultSeverity);
        setThresholdUnit(types[0].defaultUnit);
      }
    }
  }, [category, editing]);

  // When alert type changes (not editing), set defaults
  useEffect(() => {
    if (!editing && selectedTypeDef) {
      setSeverity(selectedTypeDef.defaultSeverity);
      setThresholdUnit(selectedTypeDef.defaultUnit);
    }
  }, [alertType, editing, selectedTypeDef]);

  const handleSave = async () => {
    if (!alertType) return;
    setSaving(true);
    try {
      const rule: AlertRuleInsert = {
        category,
        alert_type: alertType,
        enabled,
        severity,
        threshold_value: thresholdValue ? parseFloat(thresholdValue) : null,
        threshold_unit: thresholdUnit || null,
        comparison_period: comparisonPeriod || null,
        notes: notes.trim() || null,
      };
      const result = await onSave(rule);
      if (!result.success) {
        toast({
          title: t("toast.error"),
          description: result.message ?? "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: t("toast.success"),
          description: editing ? t("alert_rules.success_edit") : t("alert_rules.success_add"),
        });
        onOpenChange(false);
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("alert_rules.edit_title") : t("alert_rules.add_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.category")}</label>
            <Select value={category} onValueChange={setCategory} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alert Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.alert_type")}</label>
            <Select value={alertType} onValueChange={setAlertType} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typesForCategory.map((td) => (
                  <SelectItem key={td.type} value={td.type}>{t(td.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeDef && (
              <p className="text-xs text-muted-foreground">{t(selectedTypeDef.descKey)}</p>
            )}
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.severity")}</label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{t(s.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          {selectedTypeDef?.needsThreshold && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("alert_rules.threshold")}</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  placeholder="0"
                  className="flex-1"
                />
                <Input
                  value={thresholdUnit}
                  onChange={(e) => setThresholdUnit(e.target.value)}
                  className="w-20"
                  placeholder="%"
                />
              </div>
            </div>
          )}

          {/* Comparison Period */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.comparison_period")}</label>
            <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{t(p.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t("alert_rules.enabled")}</label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.notes")}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("alert_rules.notes_placeholder")}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("modal.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !alertType}>
              {saving ? "..." : t("modal.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
