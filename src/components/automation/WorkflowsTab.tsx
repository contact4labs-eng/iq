import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Zap, FolderOpen, Tag, Copy, AlertTriangle, ArrowRight,
  FileText, Mail, TrendingUp, Pencil, PlayCircle,
} from "lucide-react";

interface WorkflowStep {
  icon: React.ReactNode;
  label: string;
  description: string;
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
    id: 1,
    name: "Full Invoice Processing",
    description: "Complete pipeline: categorize, tag, dedup, and alert",
    trigger: "New Invoice Uploaded",
    runs: 120,
    active: true,
    steps: [
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: "Auto-Categorize", description: "Assign default category based on supplier mapping" },
      { icon: <Tag className="w-3.5 h-3.5" />, label: "Apply Tags", description: "Match supplier patterns and apply auto-tags" },
      { icon: <Copy className="w-3.5 h-3.5" />, label: "Check Duplicates", description: "Compare against recent invoices for duplicate detection" },
      { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Alert if High Value", description: "Flag invoices exceeding €5,000 threshold" },
    ],
  },
  {
    id: 2,
    name: "Monthly Review Pipeline",
    description: "Generate summary, flag cost increases >10%, email report",
    trigger: "End of Month",
    runs: 6,
    active: true,
    steps: [
      { icon: <FileText className="w-3.5 h-3.5" />, label: "Generate Summary", description: "Compile monthly invoice totals and category breakdown" },
      { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Flag Increases >10%", description: "Detect products/suppliers with cost increase exceeding 10%" },
      { icon: <Mail className="w-3.5 h-3.5" />, label: "Email Report", description: "Send compiled report to configured recipients" },
    ],
  },
  {
    id: 3,
    name: "High-Value Alert Pipeline",
    description: "Flag and notify team for large invoices",
    trigger: "Amount > €5,000",
    runs: 8,
    active: true,
    steps: [
      { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Flag for Review", description: "Mark invoice as requiring manual approval" },
      { icon: <Zap className="w-3.5 h-3.5" />, label: "Notify Team", description: "Send push notification to finance team" },
    ],
  },
  {
    id: 4,
    name: "Auto-Approve Small",
    description: "Auto-approve invoices under €500 after categorization",
    trigger: "Amount < €500",
    runs: 45,
    active: false,
    steps: [
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: "Categorize", description: "Assign category based on rules" },
      { icon: <Zap className="w-3.5 h-3.5" />, label: "Auto-Approve", description: "Automatically approve and close invoice" },
    ],
  },
];

export function WorkflowsTab() {
  const { t } = useLanguage();
  const [workflows, setWorkflows] = useState(DEMO_WORKFLOWS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const openEdit = (wf: Workflow) => {
    setEditingId(wf.id);
    setEditName(wf.name);
    setEditDesc(wf.description);
  };

  const saveEdit = () => {
    if (editingId === null) return;
    setWorkflows(prev => prev.map(x => x.id === editingId ? { ...x, name: editName, description: editDesc } : x));
    setEditingId(null);
  };

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
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{wf.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wf.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <PlayCircle className="w-3 h-3" />
                    {wf.runs} runs
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {wf.steps.length} {t("automation.wf_steps")}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(wf)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Switch
                    checked={wf.active}
                    onCheckedChange={checked => setWorkflows(prev => prev.map(x => x.id === wf.id ? { ...x, active: checked } : x))}
                  />
                </div>
              </div>

              {/* Trigger */}
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Zap className="w-3 h-3" />
                  {wf.trigger}
                </Badge>
              </div>

              {/* Step pipeline with descriptions */}
              <div className="space-y-2">
                {wf.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-6 h-6 rounded-full border bg-muted/80 flex items-center justify-center text-foreground shrink-0">
                        {step.icon}
                      </div>
                      {i < wf.steps.length - 1 && (
                        <div className="w-px h-4 bg-border mt-0.5" />
                      )}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
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

      {/* Edit dialog */}
      <Dialog open={editingId !== null} onOpenChange={open => { if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("automation.edit_workflow")}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>{t("automation.wf_name")}</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div><Label>{t("automation.wf_description")}</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <Button onClick={saveEdit} className="w-full">{t("automation.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
