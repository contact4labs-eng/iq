import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { IngredientModal } from "./IngredientModal";
import type { Ingredient } from "@/hooks/useIngredients";

interface IngredientsListProps {
  data: Ingredient[];
  loading: boolean;
  categories: string[];
  onRefresh: () => void;
}

export function IngredientsList({ data, loading, categories, onRefresh }: IngredientsListProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = data.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.supplier_name ?? "").toLowerCase().includes(q)
    );
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, Ingredient[]>>((acc, item) => {
    const key = item.category || t("cogs.uncategorized");
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleEdit = (item: Ingredient) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
      toast({ title: t("toast.success"), description: t("cogs.success_ingredient_delete") });
      onRefresh();
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: err instanceof Error ? err.message : t("modal.unexpected_error"), variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("cogs.search_ingredients")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          {t("cogs.add_ingredient")}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {data.length === 0 ? t("cogs.no_ingredients") : t("cogs.no_results")}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 px-1">
                  {cat} ({items.length})
                </h3>
                <div className="rounded-lg border divide-y bg-card">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="font-mono">
                            €{item.price_per_unit.toFixed(2)}/{item.unit}
                          </span>
                          {item.supplier_name && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{item.supplier_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <IngredientModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={onRefresh}
        editing={editing}
        existingCategories={categories}
      />
    </div>
  );
}
