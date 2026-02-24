import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Save } from "lucide-react";
import type { MarginThreshold } from "@/hooks/useMarginThresholds";

interface MarginThresholdSettingsProps {
  thresholds: MarginThreshold[];
  allCategories: string[]; // all product categories
  onRefresh: () => void;
}

export function MarginThresholdSettings({ thresholds, allCategories, onRefresh }: MarginThresholdSettingsProps) {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  // Local state: map category → { green_min, yellow_min }
  const [values, setValues] = useState<Record<string, { green: string; yellow: string }>>(() => {
    const m: Record<string, { green: string; yellow: string }> = {};
    for (const cat of allCategories) {
      const found = thresholds.find((t) => t.category === cat);
      m[cat] = {
        green: String(found?.green_min ?? 65),
        yellow: String(found?.yellow_min ?? 45),
      };
    }
    return m;
  });

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      for (const cat of allCategories) {
        const v = values[cat];
        if (!v) continue;
        const greenMin = parseFloat(v.green) || 65;
        const yellowMin = parseFloat(v.yellow) || 45;
        const existing = thresholds.find((t) => t.category === cat);

        if (existing) {
          const { error } = await supabase
            .from("margin_thresholds")
            .update({ green_min: greenMin, yellow_min: yellowMin })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("margin_thresholds")
            .insert({
              company_id: company.id,
              category: cat,
              green_min: greenMin,
              yellow_min: yellowMin,
            });
          if (error) throw error;
        }
      }
      toast({ title: t("toast.success"), description: t("cogs.success_thresholds_save") });
      onRefresh();
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: err instanceof Error ? err.message : t("modal.unexpected_error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (allCategories.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          {t("cogs.margin_thresholds_title")}
        </h3>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {saving ? t("modal.saving") : t("modal.save")}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        {t("cogs.margin_thresholds_desc")}
      </div>

      <div className="grid gap-3">
        {/* Header */}
        <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-muted-foreground px-1">
          <span>{t("cogs.product_category")}</span>
          <span className="text-green-600">{t("cogs.margin_green")} (%)</span>
          <span className="text-yellow-600">{t("cogs.margin_yellow")} (%)</span>
        </div>

        {allCategories.map((cat) => (
          <div key={cat} className="grid grid-cols-3 gap-3 items-center">
            <span className="text-sm truncate">{cat || t("cogs.uncategorized")}</span>
            <Input
              type="number" step="1" min="0" max="100"
              className="h-8 text-sm"
              value={values[cat]?.green ?? "65"}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [cat]: { ...prev[cat], green: e.target.value },
                }))
              }
            />
            <Input
              type="number" step="1" min="0" max="100"
              className="h-8 text-sm"
              value={values[cat]?.yellow ?? "45"}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [cat]: { ...prev[cat], yellow: e.target.value },
                }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
