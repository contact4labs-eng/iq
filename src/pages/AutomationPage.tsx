import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, ListFilter, Tag, FolderOpen, GitBranch, History } from "lucide-react";
import { RulesTab } from "@/components/automation/RulesTab";
import { CategoriesTab } from "@/components/automation/CategoriesTab";
import { AutoTagsTab } from "@/components/automation/AutoTagsTab";
import { WorkflowsTab } from "@/components/automation/WorkflowsTab";
import { ExecutionLogTab } from "@/components/automation/ExecutionLogTab";

const AutomationPage = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Zap className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("automation.title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t("automation.subtitle")}</p>
        </div>

        <Tabs defaultValue="rules">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="rules" className="gap-1.5">
              <ListFilter className="w-4 h-4" />
              {t("automation.tab_rules")}
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5">
              <FolderOpen className="w-4 h-4" />
              {t("automation.tab_categories")}
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-1.5">
              <Tag className="w-4 h-4" />
              {t("automation.tab_tags")}
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-1.5">
              <GitBranch className="w-4 h-4" />
              {t("automation.tab_workflows")}
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5">
              <History className="w-4 h-4" />
              {t("automation.tab_log")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4"><RulesTab /></TabsContent>
          <TabsContent value="categories" className="mt-4"><CategoriesTab /></TabsContent>
          <TabsContent value="tags" className="mt-4"><AutoTagsTab /></TabsContent>
          <TabsContent value="workflows" className="mt-4"><WorkflowsTab /></TabsContent>
          <TabsContent value="log" className="mt-4"><ExecutionLogTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AutomationPage;
