import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useInvoiceDetail, LineItem, InvoiceData } from "@/hooks/useInvoiceDetail";
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
import { ArrowLeft, FileText, CalendarIcon, Check, Flag, X, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  uploaded: { label: "Ανέβηκε", className: "bg-muted text-muted-foreground" },
  processing: { label: "Επεξεργασία", className: "bg-info/15 text-info" },
  extracted: { label: "Εξαγωγή", className: "bg-warning/15 text-warning" },
  approved: { label: "Εγκρίθηκε", className: "bg-success/15 text-success" },
  flagged: { label: "Σημαία", className: "bg-warning/20 text-warning" },
  rejected: { label: "Απορρίφθηκε", className: "bg-destructive/15 text-destructive" },
};

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "0,00 €";
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(v);
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
            {date ? format(date, "dd/MM/yyyy") : "Επιλογή..."}
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
  const {
    invoice,
    lineItems,
    file,
    fileUrl,
    loading,
    saving,
    error,
    updateInvoiceStatus,
    saveInvoiceEdits,
  } = useInvoiceDetail(id);

  // Editable state
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

  // Recalculate totals when line items change
  useEffect(() => {
    if (editedItems.length > 0) {
      const subtotal = editedItems.reduce((sum, i) => {
        const qty = i.quantity ?? 0;
        const price = i.unit_price ?? 0;
        return sum + qty * price;
      }, 0);
      const vatAmount = editedItems.reduce((sum, i) => {
        const qty = i.quantity ?? 0;
        const price = i.unit_price ?? 0;
        const vat = i.tax_rate ?? 0;
        return sum + qty * price * (vat / 100);
      }, 0);
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
      toast({ title: "Αποθηκεύτηκε", description: "Οι αλλαγές αποθηκεύτηκαν επιτυχώς." });
      navigate("/invoices");
    } else {
      toast({ title: "Σφάλμα", description: "Αποτυχία αποθήκευσης.", variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: string) => {
    const notes = status === "flagged" ? flagNotes : undefined;
    const ok = await updateInvoiceStatus(status, notes);
    if (ok) {
      const labels: Record<string, string> = {
        approved: "Εγκρίθηκε",
        flagged: "Σημαιώθηκε",
        rejected: "Απορρίφθηκε",
      };
      toast({ title: labels[status] || status, description: "Η κατάσταση ενημερώθηκε επιτυχώς." });
      navigate("/invoices");
    } else {
      toast({ title: "Σφάλμα", description: "Αποτυχία ενημέρωσης κατάστασης.", variant: "destructive" });
    }
  };

  if (error && !loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Πίσω
          </Button>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const status = invoice ? statusConfig[invoice.status] || { label: invoice.status, className: "bg-muted text-muted-foreground" } : null;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FileText className="w-5 h-5 text-accent" />
          <h1 className="text-xl font-bold font-display text-foreground">
            {loading ? <Skeleton className="h-6 w-48" /> : `Τιμολόγιο ${form.invoice_number || ""}`}
          </h1>
          {status && !loading && (
            <Badge variant="outline" className={`ml-2 ${status.className}`}>
              {status.label}
            </Badge>
          )}
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — Document Preview */}
          <InvoiceDocPreview file={file} fileUrl={fileUrl} loading={loading} />

          {/* RIGHT — Editable data */}
          <div className="space-y-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Header Fields */}
                <div className="bg-card border rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Στοιχεία τιμολογίου</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Προμηθευτής</Label>
                      <Input
                        value={form.supplier_name ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ΑΦΜ Προμηθευτή</Label>
                      <Input
                        value={form.supplier_afm ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, supplier_afm: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Αρ. Τιμολογίου</Label>
                      <Input
                        value={form.invoice_number ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>{/* spacer for grid alignment */}</div>
                    <DatePickerField
                      label="Ημ. Έκδοσης"
                      value={form.invoice_date ?? null}
                      onChange={(v) => setForm((f) => ({ ...f, invoice_date: v }))}
                    />
                    <DatePickerField
                      label="Ημ. Πληρωμής"
                      value={form.due_date ?? null}
                      onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="bg-card border rounded-lg p-4">
                  <InvoiceLineItemsTable items={editedItems} onChange={setEditedItems} />
                </div>

                {/* Totals */}
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <div className="flex justify-between w-48">
                      <span className="text-muted-foreground">Υποσύνολο:</span>
                      <span className="font-medium text-foreground">{formatCurrency(form.subtotal ?? null)}</span>
                    </div>
                    <div className="flex justify-between w-48">
                      <span className="text-muted-foreground">ΦΠΑ:</span>
                      <span className="font-medium text-foreground">{formatCurrency(form.vat_amount ?? null)}</span>
                    </div>
                    <div className="flex justify-between w-48 border-t pt-1 mt-1">
                      <span className="font-semibold text-foreground">Σύνολο:</span>
                      <span className="font-bold text-foreground">{formatCurrency(form.total_amount ?? null)}</span>
                    </div>
                  </div>
                </div>

                {/* Flag notes input */}
                {showFlagInput && (
                  <div className="bg-card border rounded-lg p-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Σημείωση σημαίωσης</Label>
                    <Textarea
                      value={flagNotes}
                      onChange={(e) => setFlagNotes(e.target.value)}
                      placeholder="Γιατί σημαιώνετε αυτό το τιμολόγιο;"
                      className="text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-warning text-warning-foreground hover:bg-warning/90"
                        onClick={() => handleStatusChange("flagged")}
                        disabled={saving}
                      >
                        Σημαίωση
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowFlagInput(false)}>
                        Ακύρωση
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => handleStatusChange("approved")}
                    disabled={saving}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Έγκριση
                  </Button>
                  <Button
                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                    onClick={() => setShowFlagInput(true)}
                    disabled={saving}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    Σημαίωση
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusChange("rejected")}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Απόρριψη
                  </Button>
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Αποθήκευση
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetail;
