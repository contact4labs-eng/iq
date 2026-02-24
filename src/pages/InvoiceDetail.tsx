import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useInvoiceDetail, LineItem, InvoiceData } from "@/hooks/useInvoiceDetail";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { InvoiceDocPreview } from "@/components/invoices/InvoiceDocPreview";
import { InvoiceLineItemsTable } from "@/components/invoices/InvoiceLineItemsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, CalendarIcon, Check, Flag, X, Save, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

const statusLabelKeys: Record<string, TranslationKey> = {
  uploaded: "status.uploaded",
  processing: "status.processing",
  extracted: "status.extracted",
  approved: "status.approved",
  flagged: "status.flagged",
  rejected: "status.rejected",
};

const statusClasses: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground",
  processing: "bg-info/15 text-info",
  extracted: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  flagged: "bg-warning/20 text-warning",
  rejected: "bg-destructive/15 text-destructive",
};

function formatCurrency(v: number | null, locale = "el-GR"): string {
  if (v === null || v === undefined) return "0,00 \u20AC";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(v);
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const date = value ? parseISO(value) : undefined;
  const { t } = useLanguage();
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal h-9 text-sm", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-2" />
            {date ? format(date, "dd/MM/yyyy") : t("detail.select_date")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
            locale={el}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    invoice, lineItems, file, fileUrl, loading, saving, error,
    updateInvoiceStatus, saveInvoiceEdits, deleteInvoice,
  } = useInvoiceDetail(id);

  const [form, setForm] = useState<Partial<InvoiceData>>({});
  const [editedItems, setEditedItems] = useState<LineItem[]>([]);
  const [flagNotes, setFlagNotes] = useState("");
  const [showFlagInput, setShowFlagInput] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm({
        supplier_name: invoice.supplier_name,
        supplier_afm: invoice.supplier_afm,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        vat_amount: invoice.vat_amount,
        total_amount: invoice.total_amount,
      });
    }
  }, [invoice]);

  useEffect(() => {
    setEditedItems(lineItems.map((i) => ({ ...i })));
  }, [lineItems]);

  useEffect(() => {
    if (editedItems.length > 0) {
      const subtotal = editedItems.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.unit_price ?? 0), 0);
      const vatAmount = editedItems.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.unit_price ?? 0) * ((i.tax_rate ?? 24) / 100), 0);
      setForm((f) => ({
        ...f,
        subtotal: Math.round(subtotal * 100) / 100,
        vat_amount: Math.round(vatAmount * 100) / 100,
        total_amount: Math.round((subtotal + vatAmount) * 100) / 100,
      }));
    }
  }, [editedItems]);

  const handleSave = async () => {
    const ok = await saveInvoiceEdits(form, editedItems);
    if (ok) {
      toast({ title: t("detail.saved"), description: t("detail.saved_desc") });
    } else {
      toast({ title: t("toast.error"), description: t("detail.save_error"), variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: string) => {
    // First save all edits (form data + line items)
    const saveOk = await saveInvoiceEdits(form, editedItems);
    if (!saveOk) {
      toast({ title: t("toast.error"), description: t("detail.save_error"), variant: "destructive" });
      return;
    }

    // Then update the status
    const notes = status === "flagged" ? flagNotes : undefined;
    const ok = await updateInvoiceStatus(status, notes);
    if (ok) {
      const labelKeys: Record<string, TranslationKey> = {
        approved: "detail.status_approved",
        flagged: "detail.status_flagged",
        rejected: "detail.status_rejected",
      };
      toast({ title: labelKeys[status] ? t(labelKeys[status]) : status, description: t("detail.status_updated") });
      setShowFlagInput(false);
      setFlagNotes("");
    } else {
      toast({ title: t("toast.error"), description: error || t("detail.status_error"), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    const ok = await deleteInvoice();
    if (ok) {
      toast({ title: t("detail.deleted"), description: t("detail.deleted_desc") });
      navigate("/invoices");
    } else {
      toast({ title: t("toast.error"), description: t("detail.delete_error"), variant: "destructive" });
    }
  };

  useEffect(() => {
    if (error && !loading) {
      toast({ title: t("toast.error"), description: error, variant: "destructive" });
    }
  }, [error, loading, t]);

  const statusKey = invoice ? statusLabelKeys[invoice.status] : null;
  const statusLabel = statusKey ? t(statusKey) : invoice?.status;
  const statusClass = invoice ? statusClasses[invoice.status] || "bg-muted text-muted-foreground" : "";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FileText className="w-5 h-5 text-accent" />
          <h1 className="text-xl font-bold font-display text-foreground">
            {loading ? <Skeleton className="h-6 w-48" /> : `${t("detail.invoice")} ${form.invoice_number || ""}`}
          </h1>
          {statusLabel && !loading && (
            <Badge variant="outline" className={`ml-2 ${statusClass}`}>{statusLabel}</Badge>
          )}
          {!loading && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto text-destructive hover:text-destructive" disabled={saving}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("detail.delete_title")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("detail.delete_desc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("modal.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t("detail.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InvoiceDocPreview file={file} fileUrl={fileUrl} loading={loading} />

          <div className="space-y-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="bg-card border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{t("detail.invoice_data")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("detail.supplier")}</Label>
                      <Input value={form.supplier_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("detail.supplier_afm")}</Label>
                      <Input value={form.supplier_afm ?? ""} onChange={(e) => setForm((f) => ({ ...f, supplier_afm: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("detail.invoice_number")}</Label>
                      <Input value={form.invoice_number ?? ""} onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div />
                    <DatePickerField label={t("detail.issue_date")} value={form.invoice_date ?? null} onChange={(v) => setForm((f) => ({ ...f, invoice_date: v }))} />
                    <DatePickerField label={t("detail.due_date")} value={form.due_date ?? null} onChange={(v) => setForm((f) => ({ ...f, due_date: v }))} />
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <InvoiceLineItemsTable items={editedItems} onChange={setEditedItems} />
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <div className="flex justify-between w-48">
                      <span className="text-muted-foreground">{t("detail.subtotal")}</span>
                      <span className="font-medium text-foreground">{formatCurrency(form.subtotal ?? null)}</span>
                    </div>
                    <div className="flex justify-between w-48">
                      <span className="text-muted-foreground">{t("detail.vat")}</span>
                      <span className="font-medium text-foreground">{formatCurrency(form.vat_amount ?? null)}</span>
                    </div>
                    <div className="flex justify-between w-48 border-t pt-1 mt-1">
                      <span className="font-semibold text-foreground">{t("detail.total")}</span>
                      <span className="font-bold text-foreground">{formatCurrency(form.total_amount ?? null)}</span>
                    </div>
                  </div>
                </div>

                {/* Only show action buttons if invoice is NOT already finalized */}
                {invoice && !["approved", "flagged", "rejected"].includes(invoice.status) ? (
                  <>
                    {showFlagInput && (
                      <div className="bg-card border rounded-lg p-4 space-y-2">
                        <Label className="text-xs text-muted-foreground">{t("detail.flag_notes")}</Label>
                        <Textarea value={flagNotes} onChange={(e) => setFlagNotes(e.target.value)} placeholder={t("detail.flag_placeholder")} className="text-sm" rows={3} />
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => handleStatusChange("flagged")} disabled={saving}>
                            {t("detail.flag")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowFlagInput(false)}>{t("modal.cancel")}</Button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusChange("approved")} disabled={saving}>
                        <Check className="w-4 h-4 mr-1" />
                        {t("detail.approve")}
                      </Button>
                      <Button className="bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => setShowFlagInput(true)} disabled={saving}>
                        <Flag className="w-4 h-4 mr-1" />
                        {t("detail.flag")}
                      </Button>
                      <Button variant="destructive" onClick={() => handleStatusChange("rejected")} disabled={saving}>
                        <X className="w-4 h-4 mr-1" />
                        {t("detail.reject")}
                      </Button>
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" />
                        {t("detail.save")}
                      </Button>
                    </div>
                  </>
                ) : invoice && ["approved", "flagged", "rejected"].includes(invoice.status) ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <span className="text-sm text-muted-foreground">{t("detail.invoice_finalized")}</span>
                    <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetail;
