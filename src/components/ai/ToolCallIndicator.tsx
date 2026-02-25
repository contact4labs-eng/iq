import { Database, Search, FileText, DollarSign, Package, Users, Bell, Wallet, Settings2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ToolCallInfo } from "@/hooks/useAiInsights";

/* ------------------------------------------------------------------ */
/*  Tool display names + icons                                          */
/* ------------------------------------------------------------------ */

const TOOL_META: Record<string, { icon: typeof Database; labelEn: string; labelEl: string }> = {
  query_invoices: { icon: FileText, labelEn: "Searching invoices", labelEl: "Αναζήτηση τιμολογίων" },
  query_revenue: { icon: DollarSign, labelEn: "Fetching revenue", labelEl: "Ανάκτηση εσόδων" },
  query_expenses: { icon: DollarSign, labelEn: "Fetching expenses", labelEl: "Ανάκτηση εξόδων" },
  query_suppliers: { icon: Users, labelEn: "Querying suppliers", labelEl: "Αναζήτηση προμηθευτών" },
  query_products: { icon: Package, labelEn: "Fetching products", labelEl: "Ανάκτηση προϊόντων" },
  query_ingredients: { icon: Package, labelEn: "Fetching ingredients", labelEl: "Ανάκτηση υλικών" },
  get_financial_summary: { icon: DollarSign, labelEn: "Compiling financials", labelEl: "Σύνοψη οικονομικών" },
  get_cash_position: { icon: Wallet, labelEn: "Checking cash", labelEl: "Έλεγχος ταμείου" },
  query_fixed_costs: { icon: DollarSign, labelEn: "Fetching fixed costs", labelEl: "Ανάκτηση σταθερών εξόδων" },
  get_overdue_invoices: { icon: FileText, labelEn: "Checking overdue", labelEl: "Έλεγχος ληξιπρόθεσμων" },
  get_scheduled_payments: { icon: Wallet, labelEn: "Checking payments", labelEl: "Έλεγχος πληρωμών" },
  get_alerts: { icon: Bell, labelEn: "Fetching alerts", labelEl: "Ανάκτηση ειδοποιήσεων" },
  update_invoice_status: { icon: Settings2, labelEn: "Updating invoice", labelEl: "Ενημέρωση τιμολογίου" },
  create_alert_rule: { icon: Bell, labelEn: "Creating alert", labelEl: "Δημιουργία ειδοποίησης" },
  create_fixed_cost: { icon: DollarSign, labelEn: "Adding cost", labelEl: "Προσθήκη κόστους" },
};

/* ------------------------------------------------------------------ */
/*  Active tool indicator (shows during streaming)                      */
/* ------------------------------------------------------------------ */

export function ActiveToolIndicator({ tools }: { tools: ToolCallInfo[] }) {
  const { language } = useLanguage();

  if (tools.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5 border border-accent/20 text-xs text-accent animate-fade-in">
      <Database className="w-3.5 h-3.5 animate-pulse" />
      <span className="font-medium">
        {tools.map((t) => {
          const meta = TOOL_META[t.name];
          return language === "el" ? (meta?.labelEl || t.name) : (meta?.labelEn || t.name);
        }).join(", ")}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completed tool calls badge (shows in message)                       */
/* ------------------------------------------------------------------ */

export function ToolCallBadge({ tools }: { tools: ToolCallInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  const { language, t } = useLanguage();

  if (!tools || tools.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/5 border border-accent/15 text-[11px] text-accent hover:bg-accent/10 transition-colors"
      >
        <Database className="w-3 h-3" />
        <span>
          {t("ai.tool_used")} {tools.length} {t("ai.tools_used")}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1 pl-1">
          {tools.map((tool, i) => {
            const meta = TOOL_META[tool.name];
            const Icon = meta?.icon || Database;
            return (
              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Icon className="w-3 h-3" />
                <span>{language === "el" ? (meta?.labelEl || tool.name) : (meta?.labelEn || tool.name)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
