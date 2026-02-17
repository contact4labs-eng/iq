import type { FullAnalysisResponse } from "@/hooks/useAiInsights";
import { HealthGauge } from "./HealthGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const impactStyles: Record<string, string> = {
  HIGH: "bg-destructive text-destructive-foreground",
  MEDIUM: "bg-warning text-warning-foreground",
  LOW: "bg-success text-success-foreground",
};

export function AutoInsights({ data }: { data: FullAnalysisResponse }) {
  return (
    <div className="space-y-6">
      {/* Health Score */}
      <Card>
        <CardContent className="flex justify-center py-8">
          <HealthGauge score={data.health_score} />
        </CardContent>
      </Card>

      {/* Insights */}
      {data.insights?.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" /> Insights
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.insights.map((ins, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-foreground text-sm">{ins.title}</p>
                    <Badge className={cn("text-[10px] shrink-0", impactStyles[ins.impact] ?? "bg-muted text-muted-foreground")}>
                      {ins.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ins.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Actions */}
      {data.weekly_actions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" /> Προτεινόμενες Ενέργειες
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.weekly_actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground">{a.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Flags */}
      {data.risk_flags?.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Κίνδυνοι
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.risk_flags.map((rf, i) => (
              <Card key={i} className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <p className="font-medium text-destructive text-sm mb-1">{rf.title}</p>
                  <p className="text-sm text-muted-foreground">{rf.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
