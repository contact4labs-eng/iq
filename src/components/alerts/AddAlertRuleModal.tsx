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
/*  The 6 alert types                                                  */
/* ------------------------------------------------------------------ */

export interface AlertTypeDef {
  value: string;
  labelKey: TranslationKey;
  category: "sales" | "expenses";
}

export const ALERT_TYPES: AlertTypeDef[] = [
  { value: "daily_sales", labelKey: "alert_rules.type_daily_sales", category: "sales" },
  { value: "weekly_sales", labelKey: "alert_rules.type_weekly_sales", category: "sales" },
  { value: "monthly_sales", labelKey: "alert_rules.type_monthly_sales", category: "sales" },
  { value: "daily_expenses", labelKey: "alert_rules.type_daily_expenses", category: "expenses" },
  { value: "weekly_expenses", labelKey: "alert_rules.type_weekly_expenses", category: "expenses" },
  { value: "monthly_expenses", labelKey: "alert_rules.type_monthly_expenses", category: "expenses" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
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

  const [alertType, setAlertType] = useState("daily_sales");
  const [mode, setMode] = useState<"fixed" | "smart">("fixed");
  const [thresholdValue, setThresholdValue] = useState("");
  const [smartPercent, setSmartPercent] = useState("");
  const [smartDirection, setSmartDirection] = useState<"below" | "above">("below");
  const [enabled, setEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setAlertType(editing.alert_type);
      setEnabled(editing.enabled);
      setNotes(editing.notes ?? "");

      // Detect mode from stored data
      const cfg = editing.config as Record<string, unknown> | null;
      if (cfg?.mode === "smart") {
        setMode("smart");
        setSmartPercent(cfg.percent != null ? String(cfg.percent) : "10");
        setSmartDirection((cfg.direction as "below" | "above") ?? "below");
        setThresholdValue("");
      } else {
        setMode("fixed");
        setThresholdValue(editing.threshold_value != null ? String(editing.threshold_value) : "");
        setSmartPercent("");
        setSmartDirection("below");
      }
    } else {
      setAlertType("daily_sales");
      setMode("fixed");
      setThresholdValue("");
      setSmartPercent("");
      setSmartDirection("below");
      setEnabled(true);
      setNotes("");
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!alertType) return;
    setSaving(true);
    try {
      const def = ALERT_TYPES.find((t) => t.value === alertType);

      const rule: AlertRuleInsert = {
        category: def?.category ?? "sales",
        alert_type: alertType,
        enabled,
        severity: "medium",
        notes: notes.trim() || null,
      };

      if (mode === "smart") {
        rule.threshold_value = smartPercent ? parseFloat(smartPercent) : null;
        rule.threshold_unit = "%";
        rule.config = {
          mode: "smart",
          percent: smartPercent ? parseFloat(smartPercent) : 10,
          direction: smartDirection,
        };
      } else {
        rule.threshold_value = thresholdValue ? parseFloat(thresholdValue) : null;
        rule.threshold_unit = "€";
        rule.config = { mode: "fixed" };
      }

      const result = await onSave(rule);
      if (!result.success) {
        toast({
          title: t("toast.error"),
          description: result.message ?? "Error",
          variant: "destructive",
        });
      } else {
        toast({
          title: t("toast.success"),
          description: editing ? t("alert_rules.success_edit") : t("alert_rules.success_add"),
        });
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("alert_rules.edit_title") : t("alert_rules.add_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Single dropdown with all 6 types */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.alert_type")}</label>
            <Select value={alertType} onValueChange={setAlertType} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map((td) => (
                  <SelectItem key={td.value} value={td.value}>
                    {t(td.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode toggle: Fixed € or Smart % */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("alert_rules.threshold_mode")}</label>
            <Select value={mode} onValueChange={(v) => setMode(v as "fixed" | "smart")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">{t("alert_rules.mode_fixed")}</SelectItem>
                <SelectItem value="smart">{t("alert_rules.mode_smart")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fixed mode: € threshold */}
          {mode === "fixed" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("alert_rules.threshold")}</label>
              <Input
                type="number"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                placeholder={t("alert_rules.threshold_placeholder")}
              />
            </div>
          )}

          {/* Smart mode: direction + percentage */}
          {mode === "smart" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("alert_rules.smart_direction")}</label>
                <Select value={smartDirection} onValueChange={(v) => setSmartDirection(v as "below" | "above")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="below">{t("alert_rules.direction_below")}</SelectItem>
                    <SelectItem value="above">{t("alert_rules.direction_above")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("alert_rules.smart_percent")}</label>
                <Input
                  type="number"
                  value={smartPercent}
                  onChange={(e) => setSmartPercent(e.target.value)}
                  placeholder={t("alert_rules.smart_percent_placeholder")}
                />
              </div>
            </>
          )}

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
