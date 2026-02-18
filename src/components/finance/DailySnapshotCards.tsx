import type { DailyKpis } from "@/hooks/useFinanceData";
import { Card, CardContent } from "@/components/ui/card";

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

interface DailyCard {
  label: string;
  getValue: (d: DailyKpis) => number | undefined;
  isProfit?: boolean;
}

const cards: DailyCard[] = [
  { label: "Σημερινά Έσοδα", getValue: (d) => d.today_revenue },
  { label: "Σημερινά Έξοδα", getValue: (d) => d.today_expenses },
  { label: "Σημερινό Κέρδος", getValue: (d) => d.today_profit, isProfit: true },
];

export function DailySnapshotCards({ data }: { data: DailyKpis | null }) {
  if (!data) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Ημερήσια Εικόνα</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ label, getValue, isProfit }) => {
          const value = getValue(data);
          const isNeg = isProfit && value !== undefined && value < 0;
          return (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-bold font-display ${isNeg ? "text-destructive" : "text-foreground"}`}>
                  {value !== undefined && value !== null ? fmt(value) : "—"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
