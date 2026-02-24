import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface InvoicePriceMatch {
  line_item_id: string;
  description: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  /** The actual computed price per unit (line_total / quantity when available) */
  price_per_unit: number;
  invoice_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name: string | null;
}

/**
 * Compute the real price per unit from invoice line item data.
 * When quantity is NULL/0, the unit_price field often contains the quantity (kg),
 * so the real price = line_total / unit_price.
 * When quantity is set, price = line_total / quantity.
 * Falls back to unit_price if line_total is missing.
 */
function computePricePerUnit(quantity: number | null, unitPrice: number | null, lineTotal: number | null): number {
  const qty = quantity ?? 0;
  const up = unitPrice ?? 0;
  const total = lineTotal ?? 0;

  // If we have both quantity and line_total, use those
  if (qty > 0 && total > 0) {
    return Math.round((total / qty) * 100) / 100;
  }

  // If quantity is NULL/0 but unit_price and line_total are set,
  // unit_price likely holds the quantity, so real price = line_total / unit_price
  if (qty === 0 && up > 0 && total > 0) {
    return Math.round((total / up) * 100) / 100;
  }

  // Fallback: use unit_price as-is
  return up;
}

/**
 * Hook to search invoice line items for ingredient price suggestions.
 * Primary mode: search by supplier name → get line items from their latest invoice.
 * Fallback mode: search by ingredient name description (ILIKE).
 */
export function useIngredientPriceLookup() {
  const { company } = useAuth();
  const companyId = company?.id;

  const [results, setResults] = useState<InvoicePriceMatch[]>([]);
  const [searching, setSearching] = useState(false);

  /**
   * Search by supplier name: finds the latest invoice from that supplier
   * and returns all its line items with prices.
   */
  const searchBySupplier = useCallback(
    async (supplierName: string) => {
      if (!companyId || !supplierName.trim() || supplierName.trim().length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);
      try {
        // First, find suppliers matching the name
        const { data: suppliers, error: suppErr } = await supabase
          .from("suppliers")
          .select("id, name")
          .eq("company_id", companyId)
          .ilike("name", `%${supplierName.trim()}%`);

        if (suppErr || !suppliers || suppliers.length === 0) {
          setResults([]);
          return;
        }

        const supplierIds = suppliers.map((s: any) => s.id);
        const supplierMap = new Map(suppliers.map((s: any) => [s.id, s.name]));

        // Find the latest invoice from these suppliers
        const { data: invoices, error: invErr } = await supabase
          .from("invoices")
          .select("id, invoice_number, invoice_date, supplier_id, status")
          .eq("company_id", companyId)
          .in("supplier_id", supplierIds)
          .neq("status", "rejected")
          .order("invoice_date", { ascending: false })
          .limit(1);

        if (invErr || !invoices || invoices.length === 0) {
          setResults([]);
          return;
        }

        const latestInvoice = invoices[0];

        // Get all line items from this latest invoice
        const { data: lineItems, error: liErr } = await supabase
          .from("invoice_line_items")
          .select("id, description, unit_price, quantity, line_total, invoice_id")
          .eq("invoice_id", latestInvoice.id)
          .not("unit_price", "is", null)
          .order("created_at", { ascending: true });

        if (liErr || !lineItems) {
          setResults([]);
          return;
        }

        const matches: InvoicePriceMatch[] = lineItems.map((row: any) => ({
          line_item_id: row.id,
          description: row.description ?? "",
          unit_price: row.unit_price ?? 0,
          quantity: row.quantity ?? 0,
          line_total: row.line_total ?? 0,
          price_per_unit: computePricePerUnit(row.quantity, row.unit_price, row.line_total),
          invoice_id: row.invoice_id,
          invoice_number: latestInvoice.invoice_number ?? null,
          invoice_date: latestInvoice.invoice_date ?? null,
          supplier_name: supplierMap.get(latestInvoice.supplier_id) ?? null,
        }));

        setResults(matches);
      } catch (err) {
        console.error("Supplier price lookup error:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [companyId]
  );

  /**
   * Search invoice line items matching a term (ingredient name).
   * Returns matches ordered by most recent invoice date.
   */
  const searchPrices = useCallback(
    async (searchTerm: string) => {
      if (!companyId || !searchTerm.trim() || searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);
      try {
        const { data, error } = await supabase
          .from("invoice_line_items")
          .select(`
            id,
            description,
            unit_price,
            quantity,
            line_total,
            invoice_id,
            invoices!inner (
              invoice_number,
              invoice_date,
              supplier_id,
              status
            )
          `)
          .eq("invoices.company_id", companyId)
          .ilike("description", `%${searchTerm.trim()}%`)
          .not("unit_price", "is", null)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        // Fetch supplier names
        const supplierIds = new Set<string>();
        (data ?? []).forEach((row: any) => {
          if (row.invoices?.supplier_id) supplierIds.add(row.invoices.supplier_id);
        });

        let supplierMap = new Map<string, string>();
        if (supplierIds.size > 0) {
          const { data: suppliers } = await supabase
            .from("suppliers")
            .select("id, name")
            .in("id", [...supplierIds]);
          if (suppliers) {
            supplierMap = new Map(suppliers.map((s: any) => [s.id, s.name]));
          }
        }

        const matches: InvoicePriceMatch[] = (data ?? [])
          .filter((row: any) => row.invoices?.status !== "rejected")
          .map((row: any) => ({
            line_item_id: row.id,
            description: row.description ?? "",
            unit_price: row.unit_price ?? 0,
            quantity: row.quantity ?? 0,
            line_total: row.line_total ?? 0,
            price_per_unit: computePricePerUnit(row.quantity, row.unit_price, row.line_total),
            invoice_id: row.invoice_id,
            invoice_number: row.invoices?.invoice_number ?? null,
            invoice_date: row.invoices?.invoice_date ?? null,
            supplier_name: row.invoices?.supplier_id
              ? supplierMap.get(row.invoices.supplier_id) ?? null
              : null,
          }));

        matches.sort((a, b) => {
          if (!a.invoice_date && !b.invoice_date) return 0;
          if (!a.invoice_date) return 1;
          if (!b.invoice_date) return -1;
          return b.invoice_date.localeCompare(a.invoice_date);
        });

        setResults(matches);
      } catch (err) {
        console.error("Price lookup error:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [companyId]
  );

  const latestPrice = results.length > 0 ? results[0].price_per_unit : null;
  const latestSupplier = results.length > 0 ? results[0].supplier_name : null;
  const clearResults = useCallback(() => setResults([]), []);

  return {
    results,
    searching,
    searchPrices,
    searchBySupplier,
    latestPrice,
    latestSupplier,
    clearResults,
  };
}
