import { TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { InvoiceAnalytics } from "@/components/invoices/InvoiceAnalytics";
import { useLanguage } from "@/contexts/LanguageContext";

const Analytics = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.analytics")}</h1>
          </div>
        </div>
        <InvoiceAnalytics />
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
