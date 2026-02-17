import { LineItem } from "@/hooks/useInvoiceDetail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

function formatNum(v: number | null): string {
  return v !== null && v !== undefined ? String(v) : "";
}

export function InvoiceLineItemsTable({ items, onChange }: Props) {
  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...items];
    const numFields = ["quantity", "unit_price", "vat_rate", "line_total"];
    if (numFields.includes(field)) {
      (updated[index] as unknown as Record<string, unknown>)[field] = value === "" ? null : parseFloat(value);
    } else {
      (updated[index] as unknown as Record<string, unknown>)[field] = value || null;
    }
    // Auto-calc line_total
    if (["quantity", "unit_price", "vat_rate"].includes(field)) {
      const qty = updated[index].quantity ?? 0;
      const price = updated[index].unit_price ?? 0;
      const vat = updated[index].vat_rate ?? 0;
      updated[index].line_total = Math.round((qty * price * (1 + vat / 100)) * 100) / 100;
    }
    onChange(updated);
  };

  const addRow = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: null,
        quantity: 1,
        unit_price: 0,
        vat_rate: 24,
        line_total: 0,
        isNew: true,
      },
    ]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Γραμμές τιμολογίου</h3>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Γραμμή
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/30 border-b">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[180px]">Περιγραφή</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Ποσότ.</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Τιμή μον.</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">ΦΠΑ%</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Σύνολο</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                  Δεν υπάρχουν γραμμές
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-2 py-1.5">
                    <Input
                      value={item.description ?? ""}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      className="h-8 text-sm border-0 bg-transparent px-1 focus-visible:ring-1"
                      placeholder="Περιγραφή..."
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      value={formatNum(item.quantity)}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      className="h-8 text-sm text-right border-0 bg-transparent px-1 focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      value={formatNum(item.unit_price)}
                      onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                      className="h-8 text-sm text-right border-0 bg-transparent px-1 focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      value={formatNum(item.vat_rate)}
                      onChange={(e) => updateItem(i, "vat_rate", e.target.value)}
                      className="h-8 text-sm text-right border-0 bg-transparent px-1 focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      value={formatNum(item.line_total)}
                      onChange={(e) => updateItem(i, "line_total", e.target.value)}
                      className="h-8 text-sm text-right border-0 bg-transparent px-1 focus-visible:ring-1"
                      readOnly
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
