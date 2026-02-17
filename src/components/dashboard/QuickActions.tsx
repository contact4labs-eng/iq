import { useNavigate } from "react-router-dom";
import { Upload, PlusCircle, MinusCircle, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onRevenueModal: () => void;
  onExpenseModal: () => void;
  onCashModal: () => void;
}

export function QuickActions({ onRevenueModal, onExpenseModal, onCashModal }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      label: "+ Ανέβασε τιμολόγιο",
      icon: Upload,
      onClick: () => navigate("/invoices"),
    },
    {
      label: "+ Καταχώρηση εσόδων",
      icon: PlusCircle,
      onClick: onRevenueModal,
    },
    {
      label: "+ Καταχώρηση εξόδων",
      icon: MinusCircle,
      onClick: onExpenseModal,
    },
    {
      label: "Ταμείο",
      icon: Landmark,
      onClick: onCashModal,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-secondary/60 transition-colors"
          onClick={action.onClick}
        >
          <action.icon className="w-5 h-5 text-accent" />
          <span className="text-xs font-medium text-foreground">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
