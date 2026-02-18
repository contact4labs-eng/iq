import type { PriceVolatility } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

const levelColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const levelLabels: Record<string, string> = {
  high: "Υψηλή",
  medium: "Μεσαία",
  low: "Χαμηλή",
};

export function PriceVolatilitySection({ data }: { data: PriceVolatility[] }) {
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Μεταβλητότητα Τιμών</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Προϊόν</TableHead>
              <TableHead>Προμηθευτής</TableHead>
              <TableHead className="text-right">Μ.Ο. Τιμής</TableHead>
              <TableHead className="text-right">Ελάχ.</TableHead>
              <TableHead className="text-right">Μέγ.</TableHead>
              <TableHead className="text-right">Τελευταία</TableHead>
              <TableHead className="text-right">Μεταβλ. %</TableHead>
              <TableHead>Επίπεδο</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p, i) => (
              <TableRow key={i} className={p.level === "high" ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{p.product_name}</TableCell>
                <TableCell>{p.supplier_name}</TableCell>
                <TableCell className="text-right">{fmt(p.avg_price)}</TableCell>
                <TableCell className="text-right">{fmt(p.min_price)}</TableCell>
                <TableCell className="text-right">{fmt(p.max_price)}</TableCell>
                <TableCell className="text-right">{fmt(p.latest_price)}</TableCell>
                <TableCell className="text-right">{(p.volatility ?? 0).toFixed(1)}%</TableCell>
                <TableCell>
                  <Badge className={levelColors[p.level] ?? "bg-muted text-muted-foreground"}>
                    {levelLabels[p.level] ?? p.level}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
