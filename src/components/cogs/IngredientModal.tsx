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
import { Search, FileText, TrendingUp, Loader2 } from "lucide-react";
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
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  // Auto price lookup
  const { results: priceResults, searching, searchPrices, latestPrice, latestSupplier, clearResults } =
    useIngredientPriceLookup();

  // Debounce timer for name search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-search when name changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (name.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchPrices(name.trim());
      }, 500);
    } else {
      clearResults();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, searchPrices, clearResults]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setCustomCategory("");
      setUnit(editing.unit);
      setPricePerUnit(String(editing.price_per_unit));
      setSupplierName(editing.supplier_name ?? "");
      setShowPriceHistory(false);
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
      setShowPriceHistory(false);
      setCategoryMode(existingCategories.length > 0 ? "existing" : "new");
      clearResults();
    }
  }, [editing, open, existingCategories, clearResults]);

  /** Apply a price match to the form */
  const applyPriceMatch = (match: InvoicePriceMatch) => {
    setPricePerUnit(String(match.unit_price));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {editing ? t("cogs.ingredient_modal_edit") : t("cogs.ingredient_modal_add")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name with auto-search indicator */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.ingredient_name")}</Label>
            <div className="relative mt-1">
              <Input
                placeholder={t("cogs.ingredient_name_placeholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pr-8"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
          </div>

          {/* Auto price suggestion banner */}
          {priceResults.length > 0 && !editing && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
                {t("cogs.invoice_price_found")}
              </div>

              {/* Latest price - clickable to apply */}
              <button
                type="button"
                onClick={() => applyPriceMatch(priceResults[0])}
                className="w-full text-left rounded-md bg-white dark:bg-gray-900 border px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      €{priceResults[0].unit_price.toFixed(2)}
                      <span className="text-muted-foreground font-normal ml-1">
                        — {priceResults[0].description}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {priceResults[0].supplier_name && `${priceResults[0].supplier_name} · `}
                      {priceResults[0].invoice_number && `#${priceResults[0].invoice_number} · `}
                      {formatDate(priceResults[0].invoice_date)}
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0 ml-2">
                    {t("cogs.use_price")}
                  </span>
                </div>
              </button>

              {/* Show more / price history toggle */}
              {priceResults.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowPriceHistory(!showPriceHistory)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  {showPriceHistory
                    ? t("cogs.hide_price_history")
                    : t("cogs.show_price_history").replace("{n}", String(priceResults.length))}
                </button>
              )}

              {/* Price history list */}
              {showPriceHistory && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {priceResults.slice(1).map((match) => (
                    <button
                      key={match.line_item_id}
                      type="button"
                      onClick={() => applyPriceMatch(match)}
                      className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex justify-between items-center"
                    >
                      <span className="text-muted-foreground truncate">
                        {match.description}
                        {match.supplier_name && ` · ${match.supplier_name}`}
                        {match.invoice_number && ` · #${match.invoice_number}`}
                        {` · ${formatDate(match.invoice_date)}`}
                      </span>
                      <span className="font-mono font-medium ml-2 shrink-0">
                        €{match.unit_price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
