import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface LineItem {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  tax_rate: number | null;
  line_total: number | null;
  isNew?: boolean;
}

export interface InvoiceData {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  subtotal: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_afm: string | null;
  file_id: string | null;
  notes: string | null;
}

export interface FileData {
  storage_path: string;
  file_type: string;
  original_filename: string;
}

export function useInvoiceDetail(invoiceId: string | undefined) {
  const { company, session } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [file, setFile] = useState<FileData | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId || !company?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch invoice with supplier
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .select("*, suppliers(name, afm)")
        .eq("id", invoiceId)
        .eq("company_id", company.id)
        .maybeSingle();

      if (invErr) throw invErr;
      if (!inv) {
        setError("Το τιμολόγιο δεν βρέθηκε.");
        setLoading(false);
        return;
      }

      const supplier = inv.suppliers as Record<string, unknown> | null;
      setInvoice({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
        subtotal: inv.subtotal,
        vat_amount: inv.vat_amount,
        total_amount: inv.total_amount,
        supplier_id: inv.supplier_id,
        supplier_name: (supplier?.name as string) ?? null,
        supplier_afm: (supplier?.afm as string) ?? null,
        file_id: inv.file_id,
        notes: inv.notes ?? null,
      });

      // Fetch line items
      const { data: items, error: itemsErr } = await supabase
        .from("invoice_line_items")
        .select("id, description, quantity, unit_price, tax_rate, line_total")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (itemsErr) throw itemsErr;
      setLineItems(items || []);

      // Fetch file
      if (inv.file_id) {
        const { data: fileData, error: fileErr } = await supabase
          .from("files")
          .select("storage_path, file_type, original_filename")
          .eq("id", inv.file_id)
          .maybeSingle();

        if (!fileErr && fileData) {
          setFile(fileData);
          // Get public/signed URL from storage
          const { data: urlData } = await supabase.storage
            .from("invoices")
            .createSignedUrl(fileData.storage_path, 3600);
          if (urlData?.signedUrl) {
            setFileUrl(urlData.signedUrl);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Invoice detail fetch error:", err);
      setError("Σφάλμα κατά τη φόρτωση του τιμολογίου.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, company?.id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const updateInvoiceStatus = async (newStatus: string, notes?: string) => {
    if (!invoice) return false;

    // Pre-check: block approval if total_amount is null
    if (newStatus === "approved" && (invoice.total_amount === null || invoice.total_amount === undefined)) {
      setError("Το τιμολόγιο δεν έχει ποσό. Συμπληρώστε το ποσό πριν εγκρίνετε.");
      return false;
    }

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoice.id);

      if (error) throw new Error(error.message || "Άγνωστο σφάλμα βάσης δεδομένων.");
      setInvoice((prev) => prev ? { ...prev, status: newStatus, notes: notes ?? prev.notes } : null);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Σφάλμα κατά την ενημέρωση κατάστασης.";
      console.error("Status update error:", err);
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveInvoiceEdits = async (
    editedInvoice: Partial<InvoiceData>,
    editedItems: LineItem[]
  ) => {
    if (!invoice) return false;
    setSaving(true);
    try {
      // Update invoice header
      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          invoice_number: editedInvoice.invoice_number,
          invoice_date: editedInvoice.invoice_date,
          due_date: editedInvoice.due_date,
          subtotal: editedInvoice.subtotal,
          vat_amount: editedInvoice.vat_amount,
          total_amount: editedInvoice.total_amount,
        })
        .eq("id", invoice.id);

      if (invErr) throw invErr;

      // Update supplier info if supplier exists
      if (invoice.supplier_id && (editedInvoice.supplier_name || editedInvoice.supplier_afm)) {
        await supabase
          .from("suppliers")
          .update({
            name: editedInvoice.supplier_name,
            afm: editedInvoice.supplier_afm,
          })
          .eq("id", invoice.supplier_id);
      }

      // Handle line items: delete removed, update existing, insert new
      const existingIds = editedItems.filter((i) => !i.isNew).map((i) => i.id);
      const originalIds = lineItems.map((i) => i.id);
      const deletedIds = originalIds.filter((id) => !existingIds.includes(id));

      if (deletedIds.length > 0) {
        await supabase.from("invoice_line_items").delete().in("id", deletedIds);
      }

      for (const item of editedItems) {
        if (item.isNew) {
          await supabase.from("invoice_line_items").insert({
            invoice_id: invoice.id,
            company_id: company?.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            line_total: item.line_total,
          });
        } else {
          await supabase
            .from("invoice_line_items")
            .update({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate,
              line_total: item.line_total,
            })
            .eq("id", item.id);
        }
      }

      return true;
    } catch (err) {
      console.error("Save error:", err);
      setError("Σφάλμα κατά την αποθήκευση.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    invoice,
    lineItems,
    file,
    fileUrl,
    loading,
    saving,
    error,
    updateInvoiceStatus,
    saveInvoiceEdits,
    refetch: fetchInvoice,
  };
}
