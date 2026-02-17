import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { AddRevenueModal } from "./AddRevenueModal";
import { AddExpenseModal } from "./AddExpenseModal";
import { CashRegisterModal } from "./CashRegisterModal";

interface FinanceQuickActionsProps {
  onDataChanged?: () => void;
}

export function FinanceQuickActions({ onDataChanged }: FinanceQuickActionsProps) {
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);

  const handleSuccess = () => onDataChanged?.();

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Γρήγορες Ενέργειες</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Button variant="outline" className="h-12 gap-2" onClick={() => setRevenueOpen(true)}>
          <Plus className="w-4 h-4" /> Έσοδα
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => setExpenseOpen(true)}>
          <Plus className="w-4 h-4" /> Έξοδα
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => setCashOpen(true)}>
          <Wallet className="w-4 h-4" /> Ταμείο
        </Button>
      </div>

      <AddRevenueModal open={revenueOpen} onOpenChange={setRevenueOpen} onSuccess={handleSuccess} />
      <AddExpenseModal open={expenseOpen} onOpenChange={setExpenseOpen} onSuccess={handleSuccess} />
      <CashRegisterModal open={cashOpen} onOpenChange={setCashOpen} onSuccess={handleSuccess} />
    </div>
  );
}
