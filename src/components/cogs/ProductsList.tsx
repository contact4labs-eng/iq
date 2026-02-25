import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { ProductModal } from "./ProductModal";
import type { Product } from "@/hooks/useProducts";
import type { Ingredient } from "@/hooks/useIngredients";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface ProductsListProps {
  data: Product[];
  loading: boolean;
  categories: string[];
  ingredients: Ingredient[];
  costMap: Map<string, number>;
  onRefresh: () => void;
  platforms: DeliveryPlatform[];
}

export function ProductsList({
  data,
  loading,
  categories,
  ingredients,
  costMap,
  onRefresh,
  platforms,
}: ProductsListProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("none");

  const selectedCommission =
    selectedPlatformId === "none"
      ? 0
      : platforms.find((p) => p.id === selectedPlatformId)?.commission_percent ?? 0;

  const selectedPlatformName =
    selectedPlatformId === "none"
      ? null
      : platforms.find((p) => p.id === selectedPlatformId)?.name ?? null;

  const filtered = data.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const handleEdit = (item: Product) => {
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
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: t("toast.success"),
        description: t("cogs.success_product_delete"),
      });
      onRefresh();
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : t("modal.unexpected_error"),
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const marginPercent = (sellingPrice: number, cost: number): number => {
    if (sellingPrice <= 0) return 0;
    return ((sellingPrice - cost) / sellingPrice) * 100;
  };

  const deliveryMarginPercent = (
    sellingPrice: number,
    cost: number,
    commissionPct: number
  ): number => {
    if (sellingPrice <= 0) return 0;
    const netRevenue = sellingPrice * (1 - commissionPct / 100);
    return ((netRevenue - cost) / sellingPrice) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("cogs.search_products")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          {platforms.length > 0 && (
            <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("cogs.no_commission")}</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.commission_percent}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleAdd} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            {t("cogs.add_product")}
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {data.length === 0 ? t("cogs.no_products") : t("cogs.no_results")}
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {filtered.map((item) => {
            const cost = costMap.get(item.id) ?? 0;
            const mDinein = marginPercent(item.selling_price_dinein, cost);
            const mDelivery = deliveryMarginPercent(
              item.selling_price_delivery,
              cost,
              selectedCommission
            );

            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.name}</span>
                    <Badge
                      variant={item.type === "recipe" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.type === "recipe"
                        ? t("cogs.product_type_recipe")
                        : t("cogs.product_type_resale")}
                    </Badge>
                    {item.category && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="font-mono">
                      {t("cogs.col_cost")}: €{cost.toFixed(2)}
                    </span>
                    {item.selling_price_dinein > 0 && (
                      <span>
                        {t("cogs.price_dinein")}: €{item.selling_price_dinein.toFixed(2)}{" "}
                        <span className="font-mono">({mDinein.toFixed(1)}%)</span>
                      </span>
                    )}
                    {item.selling_price_delivery > 0 && (
                      <span>
                        {t("cogs.price_delivery")}: €{item.selling_price_delivery.toFixed(2)}{" "}
                        <span className="font-mono">
                          ({mDelivery.toFixed(1)}%
                          {selectedPlatformName && ` ${selectedPlatformName}`})
                        </span>
                      </span>
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
            );
          })}
        </div>
      )}

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={onRefresh}
        editing={editing}
        existingCategories={categories}
        ingredients={ingredients}
        products={data}
      />
    </div>
  );
}
