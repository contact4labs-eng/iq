import { Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const Finance = () => (
  <DashboardLayout>
    <PageSkeleton
      title="Χρήματα"
      description="Οικονομική επισκόπηση και ταμειακές ροές"
      icon={<Wallet className="w-6 h-6 text-accent" />}
    />
  </DashboardLayout>
);

export default Finance;
