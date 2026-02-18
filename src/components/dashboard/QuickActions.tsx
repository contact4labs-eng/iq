import { useNavigate } from "react-router-dom";
import { Upload, PlusCircle, MinusCircle, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

interface QuickActionsProps {
  onRevenueModal: () => void;
  onExpenseModal: () => void;
  onCashModal: () => void;
}

export function QuickActions({ onRevenueModal, onExpenseModal, onCashModal }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const actions: { labelKey: TranslationKey; icon: typeof Upload; onClick: () => void }[] = [
    { labelKey: "quick.upload_invoice", icon: Upload, onClick: () => navigate("/invoices") },
    { labelKey: "quick.add_revenue", icon: PlusCircle, onClick: onRevenueModal },
    { labelKey: "quick.add_expense", icon: MinusCircle, onClick: onExpenseModal },
    { labelKey: "quick.cash_register", icon: Landmark, onClick: onCashModal },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Button
          key={action.labelKey}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          onClick={action.onClick}
        >
          <action.icon className="w-5 h-5 text-accent" />
          <span className="text-xs font-medium text-foreground">{t(action.labelKey)}</span>
        </Button>
      ))}
    </div>
  );
}
