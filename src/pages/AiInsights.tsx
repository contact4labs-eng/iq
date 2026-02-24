import { Brain } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAiInsights } from "@/hooks/useAiInsights";
import { BusinessQA } from "@/components/ai/BusinessQA";
import { useLanguage } from "@/contexts/LanguageContext";

const AiInsights = () => {
  const { qaMessages, qaLoading, streamingText, askQuestion, clearChat, stopGeneration } = useAiInsights();
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <Brain className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold font-display text-foreground">{t("ai.title")}</h1>
        </div>

        {/* Chat */}
        <BusinessQA
          messages={qaMessages}
          loading={qaLoading}
          streamingText={streamingText}
          onAsk={askQuestion}
          onClearChat={clearChat}
          onStopGeneration={stopGeneration}
        />
      </div>
    </DashboardLayout>
  );
};

export default AiInsights;
