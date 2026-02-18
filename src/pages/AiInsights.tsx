import { Brain } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAiInsights } from "@/hooks/useAiInsights";
import { BusinessQA } from "@/components/ai/BusinessQA";

const AiInsights = () => {
  const { qaMessages, qaLoading, askQuestion } = useAiInsights();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <Brain className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold font-display text-foreground">AI Ανάλυση</h1>
        </div>

        {/* Chat */}
        <BusinessQA messages={qaMessages} loading={qaLoading} onAsk={askQuestion} />
      </div>
    </DashboardLayout>
  );
};

export default AiInsights;
