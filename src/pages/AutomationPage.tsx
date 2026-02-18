import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Cog, Tag, GitBranch, Plus, ListFilter, Zap, FileCheck,
} from "lucide-react";

// Demo data — these will be replaced with DB data when rules are persisted
const DEMO_RULES = [
  { id: 1, name: "Office Supplies", condition: "supplier_contains:Σταθερά", action: "set_category:Γραφική Ύλη", active: true },
  { id: 2, name: "High-Value Auto-Flag", condition: "amount_above:5000", action: "flag_review", active: true },
  { id: 3, name: "Food Category", condition: "supplier_contains:Τρόφιμα", action: "set_category:Τρόφιμα", active: false },
];

const DEMO_TAGS = [
  { id: 1, name: "Urgent", pattern: "amount_above:2000", matches: 12, active: true },
  { id: 2, name: "Recurring", pattern: "supplier_contains:ΔΕΚΟ", matches: 8, active: true },
  { id: 3, name: "Tax-Relevant", pattern: "vat_above:24", matches: 5, active: false },
];

const DEMO_WORKFLOWS = [
  { id: 1, name: "Auto-Approve Small", trigger: "on_upload", actions: ["auto_approve"], condition: "amount < €500", runs: 45, active: true },
  { id: 2, name: "Flag Large Invoices", trigger: "on_extract", actions: ["flag_review", "notify_team"], condition: "amount > €5000", runs: 8, active: true },
  { id: 3, name: "Categorize & Tag", trigger: "on_extract", actions: ["set_category", "auto_tag"], condition: "always", runs: 120, active: false },
];

const AutomationPage = () => {
  const { t } = useLanguage();
  const [rules, setRules] = useState(DEMO_RULES);
  const [tags, setTags] = useState(DEMO_TAGS);
  const [workflows, setWorkflows] = useState(DEMO_WORKFLOWS);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Cog className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">{t("automation.title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t("automation.subtitle")}</p>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules" className="gap-1.5">
              <ListFilter className="w-4 h-4" />
              {t("automation.tab_rules")}
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-1.5">
              <Tag className="w-4 h-4" />
              {t("automation.tab_tags")}
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-1.5">
              <GitBranch className="w-4 h-4" />
              {t("automation.tab_workflows")}
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{t("automation.rules_title")}</CardTitle>
                  <CardDescription>{t("automation.rules_desc")}</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  {t("automation.add_rule")}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("automation.rule_name")}</TableHead>
                      <TableHead>{t("automation.rule_condition")}</TableHead>
                      <TableHead>{t("automation.rule_action")}</TableHead>
                      <TableHead>{t("automation.rule_status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.condition}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={r.active}
                            onCheckedChange={(checked) => {
                              setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: checked } : x));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {t("automation.no_rules")} {t("automation.create_first")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{t("automation.tags_title")}</CardTitle>
                  <CardDescription>{t("automation.tags_desc")}</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  {t("automation.add_tag")}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("automation.tag_name")}</TableHead>
                      <TableHead>{t("automation.tag_pattern")}</TableHead>
                      <TableHead className="text-right">{t("automation.tag_matches")}</TableHead>
                      <TableHead>{t("automation.rule_status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tg) => (
                      <TableRow key={tg.id}>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <Tag className="w-3 h-3" />
                            {tg.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tg.pattern}</code>
                        </TableCell>
                        <TableCell className="text-right font-medium">{tg.matches}</TableCell>
                        <TableCell>
                          <Switch
                            checked={tg.active}
                            onCheckedChange={(checked) => {
                              setTags(prev => prev.map(x => x.id === tg.id ? { ...x, active: checked } : x));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {tags.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {t("automation.no_tags")} {t("automation.create_first")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{t("automation.workflows_title")}</CardTitle>
                  <CardDescription>{t("automation.workflows_desc")}</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  {t("automation.add_workflow")}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("automation.wf_name")}</TableHead>
                      <TableHead>{t("automation.wf_trigger")}</TableHead>
                      <TableHead>{t("automation.rule_condition")}</TableHead>
                      <TableHead>{t("automation.wf_actions")}</TableHead>
                      <TableHead className="text-right">{t("automation.wf_runs")}</TableHead>
                      <TableHead>{t("automation.rule_status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((wf) => (
                      <TableRow key={wf.id}>
                        <TableCell className="font-medium">{wf.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Zap className="w-3 h-3" />
                            {wf.trigger}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{wf.condition}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {wf.actions.map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{wf.runs}</TableCell>
                        <TableCell>
                          <Switch
                            checked={wf.active}
                            onCheckedChange={(checked) => {
                              setWorkflows(prev => prev.map(x => x.id === wf.id ? { ...x, active: checked } : x));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {workflows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t("automation.no_workflows")} {t("automation.create_first")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AutomationPage;
