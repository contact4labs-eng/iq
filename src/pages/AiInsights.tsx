import { useState } from "react";
import { Brain, PanelLeftClose, PanelLeft } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAiInsights } from "@/hooks/useAiInsights";
import { BusinessQA } from "@/components/ai/BusinessQA";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const AiInsights = () => {
  const {
    qaMessages,
    qaLoading,
    streamingText,
    activeToolCalls,
    askQuestion,
    clearChat,
    stopGeneration,
    conversations,
    conversationsLoading,
    activeConversationId,
    loadConversation,
    newConversation,
    deleteConversation,
  } = useAiInsights();

  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Conversation Sidebar */}
        {sidebarOpen && (
          <div className="w-64 shrink-0 animate-fade-in">
            <ConversationSidebar
              conversations={conversations}
              activeId={activeConversationId}
              loading={conversationsLoading}
              onSelect={loadConversation}
              onNew={newConversation}
              onDelete={deleteConversation}
            />
          </div>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </Button>
            <Brain className="w-5 h-5 text-accent" />
            <h1 className="text-lg font-bold font-display text-foreground">{t("ai.title")}</h1>
          </div>

          {/* Chat */}
          <BusinessQA
            messages={qaMessages}
            loading={qaLoading}
            streamingText={streamingText}
            activeToolCalls={activeToolCalls}
            onAsk={askQuestion}
            onClearChat={clearChat}
            onStopGeneration={stopGeneration}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AiInsights;
