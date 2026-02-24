import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Product {
  id: string;
  company_id: string;
  name: string;
  category: string;
  type: "recipe" | "resale";
  selling_price_dinein: number;
  selling_price_delivery: number;
  linked_ingredient_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductIngredientRow {
  id: string;
  product_id: string;
  ingredient_id: string | null;
  linked_product_id: string | null;
  quantity: number;
  unit: string;
  sort_order: number;
}

/**
 * CRUD hook for products + product_ingredients.
 */
export function useProducts(refreshKey = 0) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: rows, error: err } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (err) throw err;
      setData((rows ?? []) as Product[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading products");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const categories = [...new Set(data.map((p) => p.category).filter(Boolean))].sort();

  return { data, loading, error, refetch: fetchData, categories };
}

/**
 * Fetch recipe rows for a given product.
 */
export async function fetchRecipeRows(productId: string): Promise<ProductIngredientRow[]> {
  const { data, error } = await supabase
    .from("product_ingredients")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProductIngredientRow[];
}

/**
 * Save recipe rows: delete old, insert new in one transaction-like flow.
 */
export async function saveRecipeRows(productId: string, rows: Omit<ProductIngredientRow, "id" | "product_id">[]) {
  // Delete existing
  const { error: delErr } = await supabase
    .from("product_ingredients")
    .delete()
    .eq("product_id", productId);
  if (delErr) throw delErr;

  if (rows.length === 0) return;

  // Insert new
  const inserts = rows.map((r, i) => ({
    product_id: productId,
    ingredient_id: r.ingredient_id,
    linked_product_id: r.linked_product_id,
    quantity: r.quantity,
    unit: r.unit,
    sort_order: i,
  }));

  const { error: insErr } = await supabase
    .from("product_ingredients")
    .insert(inserts);
  if (insErr) throw insErr;
}
