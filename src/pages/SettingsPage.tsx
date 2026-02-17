import { Settings } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const SettingsPage = () => (
  <DashboardLayout>
    <PageSkeleton
      title="Ρυθμίσεις"
      description="Ρυθμίσεις λογαριασμού και επιχείρησης"
      icon={<Settings className="w-6 h-6 text-accent" />}
    />
  </DashboardLayout>
);

export default SettingsPage;
