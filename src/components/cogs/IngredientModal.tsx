import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ingredient } from "@/hooks/useIngredients";

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lt", label: "lt" },
  { value: "ml", label: "ml" },
];

interface IngredientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editing?: Ingredient | null;
  existingCategories: string[];
}

export function IngredientModal({ open, onOpenChange, onSuccess, editing, existingCategories }: IngredientModalProps) {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [unit, setUnit] = useState("kg");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setCustomCategory("");
      setUnit(editing.unit);
      setPricePerUnit(String(editing.price_per_unit));
      setSupplierName(editing.supplier_name ?? "");
      // If the editing category is already known, use existing mode
      if (existingCategories.includes(editing.category)) {
        setCategoryMode("existing");
      } else {
        setCategoryMode("new");
        setCustomCategory(editing.category);
      }
    } else {
      setName("");
      setCategory(existingCategories[0] ?? "");
      setCustomCategory("");
      setUnit("kg");
      setPricePerUnit("");
      setSupplierName("");
      setCategoryMode(existingCategories.length > 0 ? "existing" : "new");
    }
  }, [editing, open, existingCategories]);

  const handleSave = async () => {
    if (!company?.id) {
      toast({ title: t("toast.error"), description: "No company found.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: t("toast.error"), description: t("cogs.error_name_required"), variant: "destructive" });
      return;
    }
    const price = parseFloat(pricePerUnit);
    if (!pricePerUnit || isNaN(price) || price < 0) {
      toast({ title: t("toast.error"), description: t("cogs.error_price_required"), variant: "destructive" });
      return;
    }

    const finalCategory = categoryMode === "new" ? customCategory.trim() : category;

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("ingredients")
          .update({
            name: name.trim(),
            category: finalCategory,
            unit,
            price_per_unit: price,
            supplier_name: supplierName.trim() || null,
          })
          .eq("id", editing.id);

        if (error) throw error;
        toast({ title: t("toast.success"), description: t("cogs.success_ingredient_edit") });
      } else {
        const { error } = await supabase.from("ingredients").insert({
          company_id: company.id,
          name: name.trim(),
          category: finalCategory,
          unit,
          price_per_unit: price,
          supplier_name: supplierName.trim() || null,
        });

        if (error) throw error;
        toast({ title: t("toast.success"), description: t("cogs.success_ingredient_add") });
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: err instanceof Error ? err.message : t("modal.unexpected_error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {editing ? t("cogs.ingredient_modal_edit") : t("cogs.ingredient_modal_add")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_name")}</Label>
            <Input
              className="mt-1"
              placeholder={t("cogs.ingredient_name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_category")}</Label>
            {existingCategories.length > 0 && (
              <div className="flex gap-2 mt-1 mb-2">
                <Button
                  type="button"
                  variant={categoryMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryMode("existing")}
                >
                  {t("cogs.category_existing")}
                </Button>
                <Button
                  type="button"
                  variant={categoryMode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryMode("new")}
                >
                  {t("cogs.category_new")}
                </Button>
              </div>
            )}
            {categoryMode === "existing" && existingCategories.length > 0 ? (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1"
                placeholder={t("cogs.category_placeholder")}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}
          </div>

          {/* Unit + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_unit")}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_price")}</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €/{unit}
                </span>
              </div>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_supplier")}</Label>
            <Input
              className="mt-1"
              placeholder={t("cogs.ingredient_supplier_placeholder")}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
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
