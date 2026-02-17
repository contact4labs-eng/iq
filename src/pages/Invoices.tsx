import { useState } from "react";
import { FileText } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { InvoiceUploadZone } from "@/components/invoices/InvoiceUploadZone";
import { InvoiceList } from "@/components/invoices/InvoiceList";

const Invoices = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">Τιμολόγια</h1>
          </div>
          <p className="text-muted-foreground">Ανέβασμα και διαχείριση τιμολογίων</p>
        </div>

        <InvoiceUploadZone onUploadComplete={() => setRefreshKey((k) => k + 1)} />
        <InvoiceList refreshKey={refreshKey} />
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
