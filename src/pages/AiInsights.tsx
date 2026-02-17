import { Brain } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const AiInsights = () => (
  <DashboardLayout>
    <PageSkeleton
      title="AI Ανάλυση"
      description="Έξυπνες προτάσεις και αναλύσεις με τεχνητή νοημοσύνη"
      icon={<Brain className="w-6 h-6 text-accent" />}
    />
  </DashboardLayout>
);

export default AiInsights;
