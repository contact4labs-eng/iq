import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_KEYS: TranslationKey[] = [
  "expense.cat_materials", "expense.cat_rent", "expense.cat_utilities", "expense.cat_payroll",
  "expense.cat_marketing", "expense.cat_equipment", "expense.cat_insurance", "expense.cat_taxes",
  "expense.cat_transport", "expense.cat_food", "expense.cat_other",
];
const PAYMENT_KEYS: TranslationKey[] = [
  "payment.cash", "payment.card", "payment.bank_transfer", "payment.other",
];

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExpenseModal({ open, onOpenChange, onSuccess }: AddExpenseModalProps) {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryKey, setCategoryKey] = useState<TranslationKey>("expense.cat_materials");
  const [date, setDate] = useState<Date>(new Date());
  const [paymentKey, setPaymentKey] = useState<TranslationKey>("payment.cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategoryKey("expense.cat_materials");
    setDate(new Date());
    setPaymentKey("payment.cash");
    setNotes("");
  };

  const handleSave = async () => {
    if (!company?.id) {
      console.error("[AddExpense] No company found — company:", company);
      toast({ title: t("toast.error"), description: "No company found. Please refresh.", variant: "destructive" });
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      toast({ title: t("toast.error"), description: t("modal.amount_error"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("expense_entries").insert({
        company_id: company.id,
        amount: parsed,
        description: description || null,
        entry_date: format(date, "yyyy-MM-dd"),
      });

      setSaving(false);

      if (error) {
        toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: t("toast.success"), description: t("expense.success") });
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      setSaving(false);
      toast({ title: t("toast.error"), description: err instanceof Error ? err.message : t("modal.unexpected_error"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{t("expense.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <Label className="text-sm text-muted-foreground">{t("modal.amount_label")}</Label>
            <div className="relative mt-1">
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-2xl font-bold h-14 pr-10" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">€</span>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">{t("modal.description")}</Label>
            <Input className="mt-1" placeholder={t("expense.desc_placeholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">{t("modal.category")}</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryKey(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    categoryKey === key ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border hover:border-accent/50"
                  )}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm text-muted-foreground">{t("modal.date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full mt-1 justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">{t("modal.payment_method")}</Label>
              <Select value={paymentKey} onValueChange={(v) => setPaymentKey(v as TranslationKey)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>{t(key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">{t("modal.notes")}</Label>
            <Textarea className="mt-1" rows={2} placeholder={t("modal.notes_placeholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("modal.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t("modal.saving") : t("modal.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
