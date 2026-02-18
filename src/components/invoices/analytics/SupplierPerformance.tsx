import type { SupplierPerformance } from "@/hooks/useInvoiceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCurrency(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v ?? 0);
}

const riskColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const riskLabels: Record<string, string> = {
  high: "Υψηλό",
  medium: "Μεσαίο",
  low: "Χαμηλό",
};

export function SupplierPerformanceSection({ data }: { data: SupplierPerformance[] }) {
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Απόδοση Προμηθευτών</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Προμηθευτής</TableHead>
              <TableHead className="text-right">Συνολική Δαπάνη</TableHead>
              <TableHead className="text-right">Τιμολόγια</TableHead>
              <TableHead className="text-right">Μέσο Τιμολόγιο</TableHead>
              <TableHead className="text-right">Εξάρτηση %</TableHead>
              <TableHead>Κίνδυνος</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{s.supplier_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(s.total_spend)}</TableCell>
                <TableCell className="text-right">{s.invoice_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(s.avg_invoice)}</TableCell>
                <TableCell className="text-right">{(s.dependency_pct ?? 0).toFixed(1)}%</TableCell>
                <TableCell>
                  <Badge className={riskColors[s.risk_level] ?? "bg-muted text-muted-foreground"}>
                    {riskLabels[s.risk_level] ?? s.risk_level}
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
