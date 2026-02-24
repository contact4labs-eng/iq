import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, BarChart3 } from "lucide-react";

function COGS() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("ingredients");

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
            <div className="text-sm text-muted-foreground">Ingredients tab — loading...</div>
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <div className="text-sm text-muted-foreground">Products tab — loading...</div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <div className="text-sm text-muted-foreground">Dashboard tab — loading...</div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default COGS;
