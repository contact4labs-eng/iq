import { FileText } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const Invoices = () => (
  <DashboardLayout>
    <PageSkeleton
      title="Τιμολόγια"
      description="Διαχείριση τιμολογίων και παραστατικών"
      icon={<FileText className="w-6 h-6 text-accent" />}
    />
  </DashboardLayout>
);

export default Invoices;
