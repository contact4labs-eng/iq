import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FixedCostEntry } from "@/hooks/useFixedCosts";

const CATEGORY_KEYS: { key: TranslationKey; value: string }[] = [
  { key: "fixed_costs.cat_rent", value: "rent" },
  { key: "fixed_costs.cat_vat", value: "vat" },
  { key: "fixed_costs.cat_income_tax", value: "income_tax" },
  { key: "fixed_costs.cat_efka", value: "efka" },
  { key: "fixed_costs.cat_employer", value: "employer" },
  { key: "fixed_costs.cat_teka", value: "teka" },
  { key: "fixed_costs.cat_fmy", value: "fmy" },
  { key: "fixed_costs.cat_deh", value: "deh" },
  { key: "fixed_costs.cat_eydap", value: "eydap" },
  { key: "fixed_costs.cat_payroll", value: "payroll" },
];

interface AddFixedCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedMonth: Date;
  editing?: FixedCostEntry | null;
}

export function AddFixedCostModal({ open, onOpenChange, onSuccess, selectedMonth, editing }: AddFixedCostModalProps) {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("rent");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setNotes(editing.notes ?? "");
    } else {
      setAmount("");
      setCategory("rent");
      setNotes("");
    }
  }, [editing, open]);

  const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const handleSave = async () => {
    if (!company?.id) {
      toast({ title: t("toast.error"), description: "No company found.", variant: "destructive" });
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      toast({ title: t("toast.error"), description: t("modal.amount_error"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // Update existing
        const { error } = await supabase
          .from("fixed_costs")
          .update({ amount: parsed, category, notes: notes || null })
          .eq("id", editing.id);

        if (error) throw error;
        toast({ title: t("toast.success"), description: t("fixed_costs.success_edit") });
      } else {
        // Insert new
        const { error } = await supabase.from("fixed_costs").insert({
          company_id: company.id,
          category,
          amount: parsed,
          month: monthStr,
          notes: notes || null,
        });

        if (error) {
          if (error.code === "23505") {
            // Unique constraint violation
            toast({ title: t("toast.error"), description: t("fixed_costs.duplicate"), variant: "destructive" });
            setSaving(false);
            return;
          }
          throw error;
        }
        toast({ title: t("toast.success"), description: t("fixed_costs.success_add") });
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: err instanceof Error ? err.message : t("modal.unexpected_error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = (value: string) => {
    const found = CATEGORY_KEYS.find((c) => c.value === value);
    return found ? t(found.key) : value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {editing ? t("fixed_costs.modal_edit") : t("fixed_costs.modal_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Category */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("fixed_costs.category")}</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!editing}>
              <SelectTrigger className="mt-1">
                <SelectValue>{categoryLabel(category)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_KEYS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{t(cat.key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("modal.amount_label")}</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold h-14 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">€</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("fixed_costs.notes")}</Label>
            <Textarea
              className="mt-1"
              rows={2}
              placeholder={t("fixed_costs.notes_placeholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("modal.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("modal.saving") : t("modal.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
