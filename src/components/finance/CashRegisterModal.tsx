import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface CashPositionRow {
  recorded_date: string;
  cash_on_hand: number;
  bank_balance: number;
  total_cash: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

interface CashRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CashRegisterModal({ open, onOpenChange, onSuccess }: CashRegisterModalProps) {
  const { company } = useAuth();
  const { toast } = useToast();

  const [startingCash, setStartingCash] = useState("");
  const [endingCash, setEndingCash] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<CashPositionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const startVal = parseFloat(startingCash) || 0;
  const endVal = parseFloat(endingCash) || 0;
  const shiftRevenue = endVal - startVal;
  const hasValues = startingCash !== "" && endingCash !== "";

  useEffect(() => {
    if (!open || !company?.id) return;
    setHistoryLoading(true);
    supabase
      .from("cash_positions")
      .select("recorded_date, cash_on_hand, bank_balance, total_cash")
      .eq("company_id", company.id)
      .order("recorded_date", { ascending: false })
      .limit(7)
      .then(({ data }) => {
        setHistory((data ?? []) as CashPositionRow[]);
        setHistoryLoading(false);
      });
  }, [open, company?.id]);

  const resetForm = () => {
    setStartingCash("");
    setEndingCash("");
    setDate(new Date());
  };

  const handleSave = async () => {
    if (!company?.id) return;
    if (!endingCash || isNaN(endVal)) {
      toast({ title: "Σφάλμα", description: "Εισάγετε έγκυρο τελικό ποσό", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Get latest bank_balance
    const { data: latestRow } = await supabase
      .from("cash_positions")
      .select("bank_balance")
      .eq("company_id", company.id)
      .order("recorded_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const bankBalance = (latestRow as { bank_balance: number } | null)?.bank_balance ?? 0;
    const totalCash = endVal + bankBalance;
    const entryDate = format(date, "yyyy-MM-dd");

    const { error: cpErr } = await supabase.from("cash_positions").insert({
      company_id: company.id,
      recorded_date: entryDate,
      cash_on_hand: endVal,
      bank_balance: bankBalance,
      total_cash: totalCash,
    });

    if (cpErr) {
      setSaving(false);
      toast({ title: "Σφάλμα", description: cpErr.message, variant: "destructive" });
      return;
    }

    if (hasValues && shiftRevenue !== 0) {
      try {
        await supabase.from("revenue_entries").insert({
          company_id: company.id,
          amount: shiftRevenue,
          description: "Ταμείο βάρδιας",
          entry_date: entryDate,
        });
      } catch (e) {
        console.error("Revenue insert failed:", e);
      }
    }

    setSaving(false);
    toast({ title: "Επιτυχία", description: "Το ταμείο ενημερώθηκε" });
    resetForm();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Ταμείο Βάρδιας</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Starting cash */}
          <div>
            <Label className="text-sm text-muted-foreground">Αρχικό ποσό</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                className="text-xl font-bold h-12 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">€</span>
            </div>
          </div>

          {/* Ending cash */}
          <div>
            <Label className="text-sm text-muted-foreground">Τελικό ποσό *</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                className="text-xl font-bold h-12 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">€</span>
            </div>
          </div>

          {/* Live revenue display */}
          {hasValues && (
            <div className={cn(
              "rounded-lg p-4 text-center border",
              shiftRevenue >= 0
                ? "bg-success/10 border-success/30"
                : "bg-destructive/10 border-destructive/30"
            )}>
              <p className="text-sm text-muted-foreground mb-1">Έσοδα βάρδιας</p>
              <p className={cn(
                "text-2xl font-bold font-display",
                shiftRevenue >= 0 ? "text-success" : "text-destructive"
              )}>
                {fmt(shiftRevenue)}
              </p>
            </div>
          )}

          {/* Date */}
          <div>
            <Label className="text-sm text-muted-foreground">Ημερομηνία</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Ακύρωση
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </div>

          {/* History */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Ιστορικό</h3>
            {historyLoading ? (
              <Skeleton className="h-32 rounded-lg" />
            ) : history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ημ/νία</TableHead>
                    <TableHead className="text-right">Μετρητά</TableHead>
                    <TableHead className="text-right">Τράπεζα</TableHead>
                    <TableHead className="text-right">Σύνολο</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{r.recorded_date}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(r.cash_on_hand)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(r.bank_balance)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(r.total_cash)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχει ιστορικό</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
