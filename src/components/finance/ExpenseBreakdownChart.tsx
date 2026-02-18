import type { ExpenseCategory } from "@/hooks/useFinanceData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

export function ExpenseBreakdownChart({ data }: { data: ExpenseCategory[] }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Ανάλυση Εξόδων</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm text-center py-8">Δεν υπάρχουν δεδομένα</p></CardContent>
      </Card>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ανάλυση Εξόδων (τρέχων μήνας)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{item.category}</span>
              <span className="text-muted-foreground">
                {fmt(item.total)} ({(item.percentage ?? 0).toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(item.total / maxTotal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
