import { useState, useEffect, useRef } from "react";
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
import { Search, FileText, TrendingUp, Loader2, Package } from "lucide-react";
import { useIngredientPriceLookup } from "@/hooks/useIngredientPriceLookup";
import type { InvoicePriceMatch } from "@/hooks/useIngredientPriceLookup";
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
  const [showAllItems, setShowAllItems] = useState(false);

  // Auto price lookup - now primarily by supplier
  const { results: priceResults, searching, searchBySupplier, clearResults } =
    useIngredientPriceLookup();

  // Debounce timer for supplier search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-search when supplier name changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (supplierName.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchBySupplier(supplierName.trim());
      }, 500);
    } else {
      clearResults();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [supplierName, searchBySupplier, clearResults]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setCustomCategory("");
      setUnit(editing.unit);
      setPricePerUnit(String(editing.price_per_unit));
      setSupplierName(editing.supplier_name ?? "");
      setShowAllItems(false);
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
      setShowAllItems(false);
      setCategoryMode(existingCategories.length > 0 ? "existing" : "new");
      clearResults();
    }
  }, [editing, open, existingCategories, clearResults]);

  /** Apply a price match to the form */
  const applyPriceMatch = (match: InvoicePriceMatch) => {
    setPricePerUnit(String(match.unit_price));
    // Also set the ingredient name from the invoice description if empty
    if (!name.trim() && match.description) {
      setName(match.description);
    }
    if (match.supplier_name && !supplierName) {
      setSupplierName(match.supplier_name);
    }
  };

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

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  // Show first 3 items by default, expand to show all
  const visibleResults = showAllItems ? priceResults : priceResults.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {editing ? t("cogs.ingredient_modal_edit") : t("cogs.ingredient_modal_add")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Supplier - moved to top for supplier-based lookup */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_supplier")}</Label>
            <div className="relative mt-1">
              <Input
                placeholder={t("cogs.ingredient_supplier_placeholder")}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="pr-8"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("cogs.supplier_search_hint")}</p>
          </div>

          {/* Invoice line items from supplier's latest invoice */}
          {priceResults.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                <Package className="w-4 h-4" />
                {t("cogs.latest_invoice_items")}
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {priceResults[0].invoice_number && `#${priceResults[0].invoice_number}`}
                  {priceResults[0].invoice_date && ` · ${formatDate(priceResults[0].invoice_date)}`}
                </span>
              </div>

              {/* Line items list */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {visibleResults.map((match) => (
                  <button
                    key={match.line_item_id}
                    type="button"
                    onClick={() => applyPriceMatch(match)}
                    className="w-full text-left rounded-md bg-white dark:bg-gray-900 border px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {match.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t("cogs.qty")}: {match.quantity} · {t("cogs.total")}: €{match.line_total?.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-sm font-mono font-semibold">€{match.unit_price.toFixed(2)}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">{t("cogs.use_price")}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Show more toggle */}
              {priceResults.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllItems(!showAllItems)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  {showAllItems
                    ? t("cogs.show_less_items")
                    : t("cogs.show_all_items").replace("{n}", String(priceResults.length))}
                </button>
              )}
            </div>
          )}

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
