import type { ProfitPressure } from "@/hooks/useFinanceData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const levelStyles: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-warning text-warning-foreground",
  MEDIUM: "bg-[hsl(50,80%,50%)] text-foreground",
  LOW: "bg-success text-success-foreground",
};

const levelLabels: Record<string, string> = {
  CRITICAL: "Κρίσιμο",
  HIGH: "Υψηλό",
  MEDIUM: "Μεσαίο",
  LOW: "Χαμηλό",
};

export function ProfitPressureCard({ data }: { data: ProfitPressure | null }) {
  if (!data) return null;

  const level = data.pressure_level?.toUpperCase() ?? "";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Πίεση Κερδοφορίας</CardTitle>
        <Badge className={levelStyles[level] ?? "bg-muted text-muted-foreground"}>
          {levelLabels[level] ?? level}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Τρέχον margin: </span>
            <span className="font-semibold text-foreground">{(data.current_margin ?? 0).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Προηγ. margin: </span>
            <span className="font-semibold text-foreground">{(data.previous_margin ?? 0).toFixed(1)}%</span>
          </div>
        </div>
        {data.top_sources && data.top_sources.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Κύριες πηγές πίεσης:</p>
            <div className="space-y-1.5">
              {data.top_sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.source}</span>
                  <span className="text-destructive font-medium">{(s.impact ?? 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
