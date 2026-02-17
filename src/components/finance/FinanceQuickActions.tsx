import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { AddRevenueModal } from "./AddRevenueModal";

interface FinanceQuickActionsProps {
  onDataChanged?: () => void;
}

export function FinanceQuickActions({ onDataChanged }: FinanceQuickActionsProps) {
  const [revenueOpen, setRevenueOpen] = useState(false);

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Γρήγορες Ενέργειες</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Button variant="outline" className="h-12 gap-2" onClick={() => setRevenueOpen(true)}>
          <Plus className="w-4 h-4" /> Έσοδα
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => { /* modal later */ }}>
          <Plus className="w-4 h-4" /> Έξοδα
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => { /* modal later */ }}>
          <Wallet className="w-4 h-4" /> Ταμείο
        </Button>
      </div>

      <AddRevenueModal
        open={revenueOpen}
        onOpenChange={setRevenueOpen}
        onSuccess={() => onDataChanged?.()}
      />
    </div>
  );
}
