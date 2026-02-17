import { Bell } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const Alerts = () => (
  <DashboardLayout>
    <PageSkeleton
      title="Ειδοποιήσεις"
      description="Ενημερώσεις και σημαντικές ειδοποιήσεις"
      icon={<Bell className="w-6 h-6 text-accent" />}
    />
  </DashboardLayout>
);

export default Alerts;
