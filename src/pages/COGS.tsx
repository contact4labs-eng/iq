import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, BarChart3 } from "lucide-react";
import { useIngredients } from "@/hooks/useIngredients";
import { useProducts } from "@/hooks/useProducts";
import { useMarginThresholds } from "@/hooks/useMarginThresholds";
import { useDeliveryPlatforms } from "@/hooks/useDeliveryPlatforms";
import { calculateAllProductCosts } from "@/hooks/useProductCost";
import { IngredientsList } from "@/components/cogs/IngredientsList";
import { ProductsList } from "@/components/cogs/ProductsList";
import { MarginThresholdSettings } from "@/components/cogs/MarginThresholdSettings";
import { COGSDashboard } from "@/components/cogs/COGSDashboard";

function COGS() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("ingredients");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const {
    data: ingredients,
    loading: ingredientsLoading,
    categories: ingredientCategories,
  } = useIngredients(refreshKey);

  const {
    data: products,
    loading: productsLoading,
    categories: productCategories,
  } = useProducts(refreshKey);

  const {
    data: thresholds,
    getMarginColor,
    refetch: refetchThresholds,
  } = useMarginThresholds(refreshKey);

  const {
    data: platforms,
    addPlatform,
    updatePlatform,
    deletePlatform,
  } = useDeliveryPlatforms(refreshKey);

  // Calculate costs
  const [costMap, setCostMap] = useState<Map<string, number>>(new Map());
  const [costsLoading, setCostsLoading] = useState(false);

  useEffect(() => {
    if (products.length === 0 || ingredients.length === 0) {
      setCostMap(new Map());
      return;
    }
    setCostsLoading(true);
    calculateAllProductCosts(products, ingredients)
      .then(setCostMap)
      .finally(() => setCostsLoading(false));
  }, [products, ingredients, refreshKey]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            {t("cogs.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("cogs.subtitle")}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ingredients" className="gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              {t("cogs.tab_ingredients")}
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5">
              <Package className="w-4 h-4" />
              {t("cogs.tab_products")}
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              {t("cogs.tab_dashboard")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients" className="mt-4">
            <IngredientsList
              data={ingredients}
              loading={ingredientsLoading}
              categories={ingredientCategories}
              onRefresh={refresh}
            />
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <ProductsList
              data={products}
              loading={productsLoading || costsLoading}
              categories={productCategories}
              ingredients={ingredients}
              costMap={costMap}
              onRefresh={refresh}
              platforms={platforms}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <div className="space-y-6">
              <COGSDashboard
                products={products}
                ingredients={ingredients}
                costMap={costMap}
                getMarginColor={getMarginColor}
                platforms={platforms}
                onAddPlatform={addPlatform}
                onUpdatePlatform={updatePlatform}
                onDeletePlatform={deletePlatform}
              />
              <MarginThresholdSettings
                thresholds={thresholds}
                allCategories={productCategories}
                onRefresh={() => {
                  refetchThresholds();
                  refresh();
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default COGS;
