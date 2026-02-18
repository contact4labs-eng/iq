import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Υλικά", "Ενοίκιο", "ΔΕΚΟ", "Μισθοδοσία", "Marketing",
  "Εξοπλισμός", "Ασφάλειες", "Φόροι", "Μεταφορά", "Τρόφιμα", "Άλλο",
];
const PAYMENT_METHODS = ["Μετρητά", "Κάρτα", "Τραπεζική μεταφορά", "Άλλο"];
const STATUSES = [
  { value: "paid", label: "Πληρωμένο" },
  { value: "pending", label: "Εκκρεμεί" },
  { value: "overdue", label: "Ληξιπρόθεσμο" },
];

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExpenseModal({ open, onOpenChange, onSuccess }: AddExpenseModalProps) {
  const { company } = useAuth();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Υλικά");
  const [date, setDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState("Μετρητά");
  const [status, setStatus] = useState("paid");
  const [isFixed, setIsFixed] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const showDueDate = status === "pending" || status === "overdue";

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("Υλικά");
    setDate(new Date());
    setPaymentMethod("Μετρητά");
    setStatus("paid");
    setIsFixed(false);
    setDueDate(undefined);
    setNotes("");
  };

  const handleSave = async () => {
    if (!company?.id) return;
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      toast({ title: "Σφάλμα", description: "Εισάγετε έγκυρο ποσό", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("expense_entries").insert({
        company_id: company.id,
        amount: parsed,
        description: [description, category].filter(Boolean).join(" — "),
        entry_date: format(date, "yyyy-MM-dd"),
      });

      setSaving(false);

      if (error) {
        toast({ title: "Σφάλμα", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Επιτυχία", description: "Το έξοδο καταχωρήθηκε" });
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      setSaving(false);
      toast({ title: "Σφάλμα", description: err instanceof Error ? err.message : "Απρόσμενο σφάλμα", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Καταχώρηση Εξόδων</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Amount */}
          <div>
            <Label className="text-sm text-muted-foreground">Ποσό *</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold h-14 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">€</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm text-muted-foreground">Περιγραφή</Label>
            <Input
              className="mt-1"
              placeholder="π.χ. Ενοίκιο Ιανουαρίου"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category pills */}
          <div>
            <Label className="text-sm text-muted-foreground">Κατηγορία</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    category === c
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card text-muted-foreground border-border hover:border-accent/50"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Payment row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm text-muted-foreground">Ημερομηνία</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full mt-1 justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Τρόπος πληρωμής</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status toggle */}
          <div>
            <Label className="text-sm text-muted-foreground">Κατάσταση</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm border transition-colors",
                    status === s.value
                      ? s.value === "paid"
                        ? "bg-success text-success-foreground border-success"
                        : s.value === "overdue"
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-warning text-warning-foreground border-warning"
                      : "bg-card text-muted-foreground border-border"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed cost toggle */}
          <div>
            <Label className="text-sm text-muted-foreground">Πάγιο κόστος</Label>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setIsFixed(true)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm border transition-colors",
                  isFixed
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border"
                )}
              >
                Ναι
              </button>
              <button
                type="button"
                onClick={() => setIsFixed(false)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm border transition-colors",
                  !isFixed
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border"
                )}
              >
                Όχι
              </button>
            </div>
          </div>

          {/* Due date — conditional */}
          {showDueDate && (
            <div>
              <Label className="text-sm text-muted-foreground">Ημ. πληρωμής</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full mt-1 justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Επιλέξτε ημερομηνία"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-sm text-muted-foreground">Σημειώσεις (προαιρετικό)</Label>
            <Textarea
              className="mt-1"
              rows={2}
              placeholder="Επιπλέον πληροφορίες..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Ακύρωση
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
