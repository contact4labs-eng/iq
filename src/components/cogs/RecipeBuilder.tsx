import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Ingredient } from "@/hooks/useIngredients";
import type { Product } from "@/hooks/useProducts";
import { convertUnits, isMetricUnit, areUnitsCompatible } from "@/utils/unitConversion";

const UNIT_OPTIONS = ["kg", "g", "lt", "ml"];

export interface RecipeRow {
  key: string; // temp client key
  ingredient_id: string | null;
  linked_product_id: string | null;
  quantity: number;
  unit: string;
}

interface RecipeBuilderProps {
  rows: RecipeRow[];
  onChange: (rows: RecipeRow[]) => void;
  ingredients: Ingredient[];
  products: Product[]; // for sub-recipe selection (exclude self)
  currentProductId?: string;
}

let _rowKey = 0;
export function newRowKey() {
  return `row_${++_rowKey}`;
}

export function RecipeBuilder({ rows, onChange, ingredients, products, currentProductId }: RecipeBuilderProps) {
  const { t } = useLanguage();

  // Exclude self from sub-recipe list
  const subRecipeProducts = products.filter(
    (p) => p.type === "recipe" && p.id !== currentProductId
  );

  const addRow = () => {
    onChange([
      ...rows,
      { key: newRowKey(), ingredient_id: null, linked_product_id: null, quantity: 0, unit: "g" },
    ]);
  };

  const removeRow = (key: string) => {
    onChange(rows.filter((r) => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<RecipeRow>) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  /** Calculate cost for a single row */
  const rowCost = (row: RecipeRow): number | null => {
    if (row.ingredient_id) {
      const ing = ingredients.find((i) => i.id === row.ingredient_id);
      if (!ing || row.quantity <= 0) return null;
      try {
        if (isMetricUnit(row.unit) && isMetricUnit(ing.unit) && areUnitsCompatible(row.unit, ing.unit)) {
          const converted = convertUnits(row.quantity, row.unit, ing.unit);
          return converted * ing.price_per_unit;
        }
        return row.quantity * ing.price_per_unit;
      } catch {
        return row.quantity * ing.price_per_unit;
      }
    }
    // Sub-recipe costs can't be calculated inline easily
    return null;
  };

  const totalCost = rows.reduce((sum, r) => {
    const c = rowCost(r);
    return c !== null ? sum + c : sum;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          {t("cogs.recipe_ingredients")}
        </label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="w-3.5 h-3.5" />
          {t("cogs.add_row")}
        </Button>
      </div>

      {rows.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
          {t("cogs.recipe_empty")}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const cost = rowCost(row);
          return (
            <div key={row.key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
              {/* Source: ingredient or sub-recipe */}
              <Select
                value={row.ingredient_id ?? row.linked_product_id ?? ""}
                onValueChange={(val) => {
                  // Check if it's an ingredient or a product
                  const isIngredient = ingredients.some((i) => i.id === val);
                  if (isIngredient) {
                    const ing = ingredients.find((i) => i.id === val);
                    updateRow(row.key, {
                      ingredient_id: val,
                      linked_product_id: null,
                      unit: ing?.unit ?? "g",
                    });
                  } else {
                    updateRow(row.key, {
                      ingredient_id: null,
                      linked_product_id: val,
                      unit: "g", // quantity = servings for sub-recipe
                    });
                  }
                }}
              >
                <SelectTrigger className="flex-1 min-w-[140px]">
                  <SelectValue placeholder={t("cogs.recipe_select_item")} />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {t("cogs.tab_ingredients")}
                      </div>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} (€{ing.price_per_unit.toFixed(2)}/{ing.unit})
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {subRecipeProducts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                        {t("cogs.recipe_sub_recipe")}
                      </div>
                      {subRecipeProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          🔗 {p.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Quantity */}
              <Input
                type="number"
                step="0.01"
                min="0"
                className="w-20"
                placeholder="0"
                value={row.quantity || ""}
                onChange={(e) => updateRow(row.key, { quantity: parseFloat(e.target.value) || 0 })}
              />

              {/* Unit */}
              {row.ingredient_id ? (
                <Select value={row.unit} onValueChange={(u) => updateRow(row.key, { unit: u })}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground w-[70px] text-center">
                  {t("cogs.recipe_servings")}
                </span>
              )}

              {/* Cost preview */}
              <span className="text-xs font-mono w-16 text-right shrink-0">
                {cost !== null ? `€${cost.toFixed(2)}` : "—"}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removeRow(row.key)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end text-sm font-medium pt-1">
          {t("cogs.recipe_total_cost")}: <span className="font-mono ml-2">€{totalCost.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
