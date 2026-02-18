import type { CashFlowPoint } from "@/hooks/useFinanceData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig: ChartConfig = {
  revenue: { label: "Έσοδα", color: "hsl(152, 56%, 45%)" },
  expenses: { label: "Έξοδα", color: "hsl(0, 72%, 51%)" },
  net_flow: { label: "Καθαρή Ροή", color: "hsl(207, 90%, 54%)" },
};

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v ?? 0);
}

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Ταμειακή Ροή</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm text-center py-8">Δεν υπάρχουν δεδομένα</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ταμειακή Ροή (6 μήνες)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-video max-h-[320px]">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis tickFormatter={fmt} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(152, 56%, 45%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="net_flow" stroke="hsl(207, 90%, 54%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-success inline-block rounded" /> Έσοδα</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-destructive inline-block rounded" /> Έξοδα</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent inline-block rounded border-dashed" /> Καθαρή Ροή</span>
        </div>
      </CardContent>
    </Card>
  );
}
