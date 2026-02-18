import { useState } from "react";
import { FileText, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { InvoiceUploadZone } from "@/components/invoices/InvoiceUploadZone";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { InvoiceAnalytics } from "@/components/invoices/InvoiceAnalytics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

const Invoices = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.invoices")}</h1>
          </div>
          <p className="text-muted-foreground">{t("invoices.subtitle")}</p>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <FileText className="w-4 h-4" />
              {t("invoices.tab_list")}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              {t("invoices.tab_analytics")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <InvoiceUploadZone onUploadComplete={() => setRefreshKey((k) => k + 1)} />
            <InvoiceList refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="analytics">
            <InvoiceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
