import { Brain, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAiInsights } from "@/hooks/useAiInsights";
import { AutoInsights } from "@/components/ai/AutoInsights";
import { BusinessQA } from "@/components/ai/BusinessQA";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const AiInsights = () => {
  const {
    analysis,
    analysisLoading,
    analysisError,
    fetchAnalysis,
    qaMessages,
    qaLoading,
    askQuestion,
  } = useAiInsights();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Brain className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold font-display text-foreground">AI Ανάλυση</h1>
            </div>
            <p className="text-muted-foreground">Έξυπνες προτάσεις και αναλύσεις με τεχνητή νοημοσύνη</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalysis}
            disabled={analysisLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${analysisLoading ? "animate-spin" : ""}`} />
            Ανανέωση
          </Button>
        </div>

        {/* Auto Insights */}
        {analysisError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">{analysisError}</p>
          </div>
        )}

        {analysisLoading && !analysis && (
          <div className="rounded-lg border bg-card p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-muted-foreground animate-pulse">Ανάλυση δεδομένων...</p>
          </div>
        )}

        {analysis && <AutoInsights data={analysis} />}

        {/* Q&A */}
        <BusinessQA messages={qaMessages} loading={qaLoading} onAsk={askQuestion} />
      </div>
    </DashboardLayout>
  );
};

export default AiInsights;
