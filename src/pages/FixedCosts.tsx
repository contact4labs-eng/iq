import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { useFixedCosts, type FixedCostEntry } from "@/hooks/useFixedCosts";
import { AddFixedCostModal } from "@/components/finance/AddFixedCostModal";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus,
  Pencil, Trash2, Receipt, FileX2,
} from "lucide-react";

const CATEGORY_KEYS: { key: TranslationKey; value: string }[] = [
  { key: "fixed_costs.cat_rent", value: "rent" },
  { key: "fixed_costs.cat_vat", value: "vat" },
  { key: "fixed_costs.cat_income_tax", value: "income_tax" },
  { key: "fixed_costs.cat_efka", value: "efka" },
  { key: "fixed_costs.cat_employer", value: "employer" },
  { key: "fixed_costs.cat_teka", value: "teka" },
  { key: "fixed_costs.cat_fmy", value: "fmy" },
  { key: "fixed_costs.cat_deh", value: "deh" },
  { key: "fixed_costs.cat_eydap", value: "eydap" },
];

function FixedCosts() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedCostEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading } = useFixedCosts(selectedMonth, refreshKey);

  const total = data.reduce((s, r) => s + r.amount, 0);

  const prevMonth = () =>
    setSelectedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setSelectedMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthLabel = selectedMonth.toLocaleDateString("el-GR", {
    month: "long",
    year: "numeric",
  });

  const categoryLabel = (value: string) => {
    const found = CATEGORY_KEYS.find((c) => c.value === value);
    return found ? t(found.key) : value;
  };

  const fmt = (n: number) =>
    n.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("fixed_costs").delete().eq("id", id);
      if (error) throw error;
      toast({ title: t("toast.success"), description: t("fixed_costs.success_delete") });
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : t("modal.unexpected_error"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (entry: FixedCostEntry) => {
    setEditing(entry);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-primary" />
              {t("fixed_costs.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("fixed_costs.subtitle")}
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("fixed_costs.add")}
          </Button>
        </div>

        {/* Month selector + Summary */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Month navigator */}
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-lg font-semibold capitalize">{monthLabel}</span>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Total card */}
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("fixed_costs.total")}</p>
                <p className="text-2xl font-bold">{fmt(total)} €</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {data.length} {t("fixed_costs.entries")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </CardContent>
          </Card>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
              <FileX2 className="w-12 h-12 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold">{t("fixed_costs.no_data")}</h3>
              <p className="text-sm text-muted-foreground">{t("fixed_costs.no_data_desc")}</p>
              <Button onClick={openAdd} variant="outline" className="mt-2 gap-2">
                <Plus className="w-4 h-4" />
                {t("fixed_costs.add")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">{t("fixed_costs.category")}</TableHead>
                    <TableHead className="text-right">{t("modal.amount_label")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("fixed_costs.notes")}</TableHead>
                    <TableHead className="text-right w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-muted-foreground" />
                          {categoryLabel(entry.category)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(entry.amount)} €
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                        {entry.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(entry)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {categoryLabel(entry.category)}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("fixed_costs.confirm_delete")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("modal.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={deleting}
                                  onClick={() => handleDelete(entry.id)}
                                >
                                  {deleting ? "..." : t("modal.save")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <AddFixedCostModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
        selectedMonth={selectedMonth}
        editing={editing}
      />
    </DashboardLayout>
  );
}

export default FixedCosts;
