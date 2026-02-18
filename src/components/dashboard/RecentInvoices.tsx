import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

interface Invoice {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_at: string;
  status: string;
  invoice_number?: string;
}

interface RecentInvoicesProps {
  invoices: Invoice[];
  loading: boolean;
}

const statusKeys: Record<string, { labelKey: TranslationKey; className: string }> = {
  approved: { labelKey: "status.approved", className: "bg-success/15 text-success border-success/30" },
  extracted: { labelKey: "status.extracted", className: "bg-warning/15 text-warning border-warning/30" },
  flagged: { labelKey: "status.flagged", className: "bg-warning/20 text-warning border-warning/40" },
  rejected: { labelKey: "status.rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
  processing: { labelKey: "status.processing", className: "bg-info/15 text-info border-info/30" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function RecentInvoices({ invoices, loading }: RecentInvoicesProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="bg-card border rounded-lg p-5 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t("dashboard.recent_invoices")}</h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : invoices.length > 0 ? (
        <div className="space-y-1">
          {invoices.map((inv) => {
            const statusConf = statusKeys[inv.status];
            const label = statusConf ? t(statusConf.labelKey) : inv.status;
            const className = statusConf?.className || "bg-muted text-muted-foreground border-border";
            return (
              <button
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="w-full flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-secondary/60 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {inv.supplier_name || t("dashboard.unknown_supplier")}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${className}`}>
                    {label}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground w-20 text-right">
                    {formatCurrency(inv.total_amount)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("dashboard.no_invoices")}</p>
      )}
    </div>
  );
}
