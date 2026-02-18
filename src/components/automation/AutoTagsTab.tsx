import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Tag } from "lucide-react";

interface AutoTag {
  id: number;
  supplierPattern: string;
  tag: string;
  category: string;
  active: boolean;
  matchCount: number;
}

const DEMO_TAGS: AutoTag[] = [
  { id: 1, supplierPattern: "ΔΕΚΟ|ΔΕΗ|ΕΥΔΑΠ", tag: "Utilities", category: "Utilities", active: true, matchCount: 34 },
  { id: 2, supplierPattern: "Vodafone|Cosmote|Wind", tag: "Telecom", category: "Services", active: true, matchCount: 18 },
  { id: 3, supplierPattern: "Amazon|Microsoft|Google", tag: "Software", category: "Software", active: true, matchCount: 12 },
  { id: 4, supplierPattern: "ΕΛΤΑ|ACS|Speedex", tag: "Shipping", category: "Services", active: false, matchCount: 7 },
  { id: 5, supplierPattern: "AB Βασιλόπουλος|Σκλαβενίτης", tag: "Supplies", category: "Office", active: true, matchCount: 9 },
];

export function AutoTagsTab() {
  const { t } = useLanguage();
  const [tags, setTags] = useState(DEMO_TAGS);
  const [showNew, setShowNew] = useState(false);
  const [newTag, setNewTag] = useState({ supplierPattern: "", tag: "", category: "" });

  const handleAdd = () => {
    if (!newTag.supplierPattern || !newTag.tag) return;
    setTags(prev => [...prev, { id: Date.now(), ...newTag, active: true, matchCount: 0 }]);
    setNewTag({ supplierPattern: "", tag: "", category: "" });
    setShowNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("automation.tags_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("automation.tags_desc")}</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />{t("automation.add_tag")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("automation.add_tag")}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>{t("automation.supplier_pattern")}</Label><Input value={newTag.supplierPattern} onChange={e => setNewTag(p => ({ ...p, supplierPattern: e.target.value }))} placeholder="e.g. Vodafone|Cosmote" /></div>
              <div><Label>{t("automation.tag_to_apply")}</Label><Input value={newTag.tag} onChange={e => setNewTag(p => ({ ...p, tag: e.target.value }))} placeholder="e.g. Telecom" /></div>
              <div><Label>{t("automation.tag_category")}</Label><Input value={newTag.category} onChange={e => setNewTag(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Services" /></div>
              <Button onClick={handleAdd} className="w-full">{t("automation.add_tag")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("automation.supplier_pattern")}</TableHead>
                <TableHead>{t("automation.tag_to_apply")}</TableHead>
                <TableHead>{t("automation.tag_category")}</TableHead>
                <TableHead className="text-right">{t("automation.tag_matches")}</TableHead>
                <TableHead>{t("automation.rule_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map(tg => (
                <TableRow key={tg.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{tg.supplierPattern}</code>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1"><Tag className="w-3 h-3" />{tg.tag}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tg.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{tg.matchCount}</TableCell>
                  <TableCell>
                    <Switch checked={tg.active} onCheckedChange={checked => setTags(prev => prev.map(x => x.id === tg.id ? { ...x, active: checked } : x))} />
                  </TableCell>
                </TableRow>
              ))}
              {tags.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("automation.no_tags")} {t("automation.create_first")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
