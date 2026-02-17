import { Home } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const Index = () => (
  <DashboardLayout>
    <PageSkeleton
      title="Αρχική"
      description="Επισκόπηση της επιχείρησής σας"
      icon={<Home className="w-6 h-6 text-accent" />}
    />
  </DashboardLayout>
);

export default Index;
