import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2 } from "lucide-react";

const CATEGORY_COLORS = [
  "hsl(217, 91%, 60%)", "hsl(152, 56%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(270, 50%, 55%)", "hsl(330, 60%, 55%)",
  "hsl(180, 60%, 45%)", "hsl(60, 70%, 45%)",
];

interface Category {
  id: number;
  name: string;
  color: string;
  count: number;
}

const DEMO_CATEGORIES: Category[] = [
  { id: 1, name: "Software", color: CATEGORY_COLORS[0], count: 23 },
  { id: 2, name: "Hardware", color: CATEGORY_COLORS[4], count: 11 },
  { id: 3, name: "Services", color: CATEGORY_COLORS[1], count: 34 },
  { id: 4, name: "Office", color: CATEGORY_COLORS[2], count: 18 },
  { id: 5, name: "Marketing", color: CATEGORY_COLORS[5], count: 7 },
  { id: 6, name: "Utilities", color: CATEGORY_COLORS[6], count: 15 },
];

export function CategoriesTab() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    setCategories(prev => [...prev, { id: Date.now(), name: newName.trim(), color: newColor, count: 0 }]);
    setNewName("");
    setNewColor(CATEGORY_COLORS[0]);
    setShowNew(false);
  };

  const handleDelete = (id: number) => setCategories(prev => prev.filter(c => c.id !== id));

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setCategories(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("automation.categories_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("automation.categories_desc")}</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />{t("automation.add_category")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("automation.add_category")}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>{t("automation.cat_name")}</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Travel" /></div>
              <div>
                <Label>{t("automation.cat_color")}</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {CATEGORY_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">{t("automation.add_category")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {categories.map((cat, idx) => (
          <Card
            key={cat.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`cursor-grab active:cursor-grabbing transition-all ${dragIdx === idx ? "opacity-50 scale-[0.98]" : ""}`}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="font-medium text-sm text-foreground flex-1">{cat.name}</span>
              <Badge variant="secondary" className="text-xs">{cat.count} invoices</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card><CardContent className="text-center text-muted-foreground py-12">{t("automation.no_categories")} {t("automation.create_first")}</CardContent></Card>
      )}
    </div>
  );
}
