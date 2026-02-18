import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Zap, FolderOpen, Tag, Copy, AlertTriangle, ArrowRight,
} from "lucide-react";

interface WorkflowStep {
  icon: React.ReactNode;
  label: string;
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  runs: number;
  active: boolean;
}

const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: 1, name: "Full Invoice Processing", description: "Complete pipeline: categorize, tag, dedup, and alert",
    trigger: "New Invoice Uploaded", runs: 120, active: true,
    steps: [
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: "Auto-Categorize" },
      { icon: <Tag className="w-3.5 h-3.5" />, label: "Apply Tags" },
      { icon: <Copy className="w-3.5 h-3.5" />, label: "Check Duplicates" },
      { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Alert if High Value" },
    ],
  },
  {
    id: 2, name: "High-Value Alert Pipeline", description: "Flag and notify team for large invoices",
    trigger: "Amount > €5,000", runs: 8, active: true,
    steps: [
      { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Flag for Review" },
      { icon: <Zap className="w-3.5 h-3.5" />, label: "Notify Team" },
    ],
  },
  {
    id: 3, name: "Auto-Approve Small", description: "Auto-approve invoices under €500",
    trigger: "Amount < €500", runs: 45, active: false,
    steps: [
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: "Categorize" },
      { icon: <Zap className="w-3.5 h-3.5" />, label: "Auto-Approve" },
    ],
  },
];

export function WorkflowsTab() {
  const { t } = useLanguage();
  const [workflows, setWorkflows] = useState(DEMO_WORKFLOWS);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("automation.workflows_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("automation.workflows_desc")}</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />{t("automation.add_workflow")}</Button>
      </div>

      <div className="grid gap-4 grid-cols-1">
        {workflows.map(wf => (
          <Card key={wf.id} className={`transition-all ${wf.active ? "border-border" : "border-border/50 opacity-70"}`}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{wf.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wf.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="text-xs">{wf.runs} runs</Badge>
                  <Switch checked={wf.active} onCheckedChange={checked => setWorkflows(prev => prev.map(x => x.id === wf.id ? { ...x, active: checked } : x))} />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Zap className="w-3 h-3" />
                  {wf.trigger}
                </Badge>
              </div>

              {/* Step pipeline */}
              <div className="flex items-center gap-1 flex-wrap">
                {wf.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground">
                      {step.icon}
                      {step.label}
                    </div>
                    {i < wf.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card><CardContent className="text-center text-muted-foreground py-12">{t("automation.no_workflows")} {t("automation.create_first")}</CardContent></Card>
      )}
    </div>
  );
}
