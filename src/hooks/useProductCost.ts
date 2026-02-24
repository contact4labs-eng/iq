import { supabase } from "@/lib/supabase";
import { convertUnits } from "@/utils/unitConversion";
import type { Ingredient } from "@/hooks/useIngredients";
import type { Product, ProductIngredientRow } from "@/hooks/useProducts";

/**
 * Calculate the cost of a single product.
 * For resale products: cost = linked ingredient's price_per_unit (per 1 unit).
 * For recipe products: sum of each ingredient row's cost.
 * Sub-recipes are resolved recursively with cycle detection.
 */
export async function calculateProductCost(
  product: Product,
  ingredientsMap: Map<string, Ingredient>,
  productsMap: Map<string, Product>,
  visited: Set<string> = new Set()
): Promise<number> {
  // Cycle detection
  if (visited.has(product.id)) return 0;
  visited.add(product.id);

  // Resale: cost = linked ingredient price (for 1 unit)
  if (product.type === "resale") {
    if (!product.linked_ingredient_id) return 0;
    const ing = ingredientsMap.get(product.linked_ingredient_id);
    return ing ? ing.price_per_unit : 0;
  }

  // Recipe: fetch rows and sum costs
  const { data: rows, error } = await supabase
    .from("product_ingredients")
    .select("*")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });

  if (error || !rows) return 0;

  let total = 0;

  for (const row of rows as ProductIngredientRow[]) {
    if (row.ingredient_id) {
      // Direct ingredient
      const ing = ingredientsMap.get(row.ingredient_id);
      if (!ing) continue;
      try {
        const convertedQty = convertUnits(row.quantity, row.unit, ing.unit);
        total += convertedQty * ing.price_per_unit;
      } catch {
        // Incompatible units — use raw quantity
        total += row.quantity * ing.price_per_unit;
      }
    } else if (row.linked_product_id) {
      // Sub-recipe
      const subProduct = productsMap.get(row.linked_product_id);
      if (!subProduct) continue;
      const subCost = await calculateProductCost(subProduct, ingredientsMap, productsMap, new Set(visited));
      total += subCost * row.quantity;
    }
  }

  return total;
}

/**
 * Calculate costs for all products in batch.
 * Returns a map of product_id → cost.
 */
export async function calculateAllProductCosts(
  products: Product[],
  ingredients: Ingredient[]
): Promise<Map<string, number>> {
  const ingredientsMap = new Map(ingredients.map((i) => [i.id, i]));
  const productsMap = new Map(products.map((p) => [p.id, p]));
  const costMap = new Map<string, number>();

  for (const product of products) {
    const cost = await calculateProductCost(product, ingredientsMap, productsMap);
    costMap.set(product.id, Math.round(cost * 100) / 100);
  }

  return costMap;
}
