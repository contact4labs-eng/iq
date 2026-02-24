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
import { RecipeBuilder, newRowKey } from "./RecipeBuilder";
import type { RecipeRow } from "./RecipeBuilder";
import type { Product, ProductIngredientRow } from "@/hooks/useProducts";
import { fetchRecipeRows, saveRecipeRows } from "@/hooks/useProducts";
import type { Ingredient } from "@/hooks/useIngredients";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editing?: Product | null;
  existingCategories: string[];
  ingredients: Ingredient[];
  products: Product[];
}

export function ProductModal({
  open, onOpenChange, onSuccess, editing, existingCategories, ingredients, products,
}: ProductModalProps) {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [type, setType] = useState<"recipe" | "resale">("recipe");
  const [priceDinein, setPriceDinein] = useState("");
  const [priceDelivery, setPriceDelivery] = useState("");
  const [linkedIngredientId, setLinkedIngredientId] = useState("");
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setPriceDinein(String(editing.selling_price_dinein || ""));
      setPriceDelivery(String(editing.selling_price_delivery || ""));
      setLinkedIngredientId(editing.linked_ingredient_id ?? "");

      if (existingCategories.includes(editing.category)) {
        setCategoryMode("existing");
        setCategory(editing.category);
        setCustomCategory("");
      } else {
        setCategoryMode("new");
        setCustomCategory(editing.category);
      }

      // Load recipe rows
      if (editing.type === "recipe") {
        fetchRecipeRows(editing.id).then((rows) => {
          setRecipeRows(
            rows.map((r: ProductIngredientRow) => ({
              key: newRowKey(),
              ingredient_id: r.ingredient_id,
              linked_product_id: r.linked_product_id,
              quantity: r.quantity,
              unit: r.unit,
            }))
          );
        });
      } else {
        setRecipeRows([]);
      }
    } else {
      setName("");
      setCategory(existingCategories[0] ?? "");
      setCustomCategory("");
      setCategoryMode(existingCategories.length > 0 ? "existing" : "new");
      setType("recipe");
      setPriceDinein("");
      setPriceDelivery("");
      setLinkedIngredientId("");
      setRecipeRows([]);
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

    const finalCategory = categoryMode === "new" ? customCategory.trim() : category;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: finalCategory,
        type,
        selling_price_dinein: parseFloat(priceDinein) || 0,
        selling_price_delivery: parseFloat(priceDelivery) || 0,
        linked_ingredient_id: type === "resale" && linkedIngredientId ? linkedIngredientId : null,
      };

      let productId: string;

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
        productId = editing.id;
        toast({ title: t("toast.success"), description: t("cogs.success_product_edit") });
      } else {
        const { data: inserted, error } = await supabase
          .from("products")
          .insert({ ...payload, company_id: company.id })
          .select("id")
          .single();
        if (error) throw error;
        productId = inserted.id;
        toast({ title: t("toast.success"), description: t("cogs.success_product_add") });
      }

      // Save recipe rows if recipe type
      if (type === "recipe") {
        await saveRecipeRows(
          productId,
          recipeRows
            .filter((r) => r.ingredient_id || r.linked_product_id)
            .map((r) => ({
              ingredient_id: r.ingredient_id,
              linked_product_id: r.linked_product_id,
              quantity: r.quantity,
              unit: r.unit,
              sort_order: 0,
            }))
        );
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {editing ? t("cogs.edit_product") : t("cogs.add_product_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.product_name")}</Label>
            <Input
              className="mt-1"
              placeholder={t("cogs.product_name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.product_category")}</Label>
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1"
                placeholder={t("cogs.product_category_placeholder")}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}
          </div>

          {/* Type toggle */}
          <div>
            <Label className="text-sm text-muted-foreground">{t("cogs.product_type")}</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={type === "recipe" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("recipe")}
              >
                {t("cogs.product_type_recipe")}
              </Button>
              <Button
                type="button"
                variant={type === "resale" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("resale")}
              >
                {t("cogs.product_type_resale")}
              </Button>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground">{t("cogs.price_dinein")}</Label>
              <div className="relative mt-1">
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={priceDinein}
                  onChange={(e) => setPriceDinein(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">{t("cogs.price_delivery")}</Label>
              <div className="relative mt-1">
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={priceDelivery}
                  onChange={(e) => setPriceDelivery(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </div>
          </div>

          {/* Recipe builder OR linked ingredient */}
          {type === "recipe" ? (
            <RecipeBuilder
              rows={recipeRows}
              onChange={setRecipeRows}
              ingredients={ingredients}
              products={products}
              currentProductId={editing?.id}
            />
          ) : (
            <div>
              <Label className="text-sm text-muted-foreground">{t("cogs.linked_ingredient")}</Label>
              <Select value={linkedIngredientId} onValueChange={setLinkedIngredientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("cogs.recipe_select_item")} />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} (€{ing.price_per_unit.toFixed(2)}/{ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
