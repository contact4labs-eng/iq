import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FileText className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold font-display text-foreground">Λεπτομέρειες Τιμολογίου</h1>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-muted-foreground text-sm">ID: {id}</p>
          <p className="text-muted-foreground mt-2">Η σελίδα λεπτομερειών θα προστεθεί σύντομα.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetail;
