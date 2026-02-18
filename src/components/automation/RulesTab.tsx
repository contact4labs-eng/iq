import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, ListFilter, Zap, ShieldCheck, Tag, FolderOpen, AlertTriangle, Eye,
  Copy, Bell, TrendingUp,
} from "lucide-react";

type Trigger = "new_invoice" | "amount_threshold" | "supplier_match" | "product_match" | "date_pattern" | "invoice_created" | "due_date_approaching" | "invoice_approved";
type Action = "add_tag" | "set_category" | "send_alert" | "flag_review" | "flag_duplicate" | "send_reminder" | "notify_admin" | "require_approval" | "flag_anomaly";

interface Rule {
  id: number;
  name: string;
  trigger: Trigger;
  condition: string;
  action: Action;
  actionValue: string;
  active: boolean;
  matchCount: number;
}

const TRIGGER_ICONS: Record<Trigger, React.ReactNode> = {
  new_invoice: <Zap className="w-4 h-4" />,
  amount_threshold: <AlertTriangle className="w-4 h-4" />,
  supplier_match: <Eye className="w-4 h-4" />,
  product_match: <FolderOpen className="w-4 h-4" />,
  date_pattern: <ListFilter className="w-4 h-4" />,
  invoice_created: <Zap className="w-4 h-4" />,
  due_date_approaching: <Bell className="w-4 h-4" />,
  invoice_approved: <ShieldCheck className="w-4 h-4" />,
};

const ACTION_ICONS: Record<Action, React.ReactNode> = {
  add_tag: <Tag className="w-3.5 h-3.5" />,
  set_category: <FolderOpen className="w-3.5 h-3.5" />,
  send_alert: <AlertTriangle className="w-3.5 h-3.5" />,
  flag_review: <ShieldCheck className="w-3.5 h-3.5" />,
  flag_duplicate: <Copy className="w-3.5 h-3.5" />,
  send_reminder: <Bell className="w-3.5 h-3.5" />,
  notify_admin: <AlertTriangle className="w-3.5 h-3.5" />,
  require_approval: <ShieldCheck className="w-3.5 h-3.5" />,
  flag_anomaly: <TrendingUp className="w-3.5 h-3.5" />,
};

const DEMO_RULES: Rule[] = [
  { id: 1, name: "Tag invoices from ΔΕΚΟ as Utilities", trigger: "supplier_match", condition: "ΔΕΚΟ", action: "set_category", actionValue: "Utilities", active: true, matchCount: 34 },
  { id: 2, name: "Flag invoices over 1000 EUR as high-value", trigger: "amount_threshold", condition: "1000", action: "flag_review", actionValue: "", active: true, matchCount: 12 },
  { id: 3, name: "Auto-categorize by supplier name pattern", trigger: "supplier_match", condition: "Τρόφιμα", action: "set_category", actionValue: "Food & Beverage", active: false, matchCount: 8 },
  { id: 4, name: "Tag Software subscriptions", trigger: "product_match", condition: "license|subscription|SaaS", action: "add_tag", actionValue: "Software", active: true, matchCount: 19 },
  { id: 5, name: "Duplicate Invoice Detection", trigger: "invoice_created", condition: "Same supplier + same amount + date within 7 days", action: "flag_duplicate", actionValue: "", active: true, matchCount: 3 },
  { id: 6, name: "Payment Reminder Workflow", trigger: "due_date_approaching", condition: "Due date within 7 days and status unpaid", action: "send_reminder", actionValue: "", active: true, matchCount: 15 },
  { id: 7, name: "Budget Threshold Alert", trigger: "invoice_approved", condition: "Monthly category spend exceeds 80% of budget", action: "notify_admin", actionValue: "", active: true, matchCount: 5 },
  { id: 8, name: "High-Value Approval Workflow", trigger: "invoice_created", condition: "Invoice amount exceeds 5000 EUR", action: "require_approval", actionValue: "", active: true, matchCount: 7 },
  { id: 9, name: "Anomaly Detection", trigger: "invoice_created", condition: "Amount deviates >50% from supplier average", action: "flag_anomaly", actionValue: "", active: true, matchCount: 4 },
];

export function RulesTab() {
  const { t } = useLanguage();
  const [rules, setRules] = useState(DEMO_RULES);
  const [showNew, setShowNew] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", trigger: "new_invoice" as Trigger, condition: "", action: "add_tag" as Action, actionValue: "" });

  const triggerLabel = (tr: Trigger) => t(`automation.trigger_${tr}`);
  const actionLabel = (ac: Action) => t(`automation.action_${ac}`);

  const handleAdd = () => {
    if (!newRule.name) return;
    setRules(prev => [...prev, {
      id: Date.now(), ...newRule, active: true, matchCount: 0,
    }]);
    setNewRule({ name: "", trigger: "new_invoice", condition: "", action: "add_tag", actionValue: "" });
    setShowNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("automation.rules_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("automation.rules_desc")}</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />{t("automation.add_rule")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("automation.add_rule")}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>{t("automation.rule_name")}</Label><Input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Flag high-value invoices" /></div>
              <div><Label>{t("automation.wf_trigger")}</Label>
                <Select value={newRule.trigger} onValueChange={v => setNewRule(p => ({ ...p, trigger: v as Trigger }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["new_invoice","amount_threshold","supplier_match","product_match","date_pattern"] as Trigger[]).map(tr => (
                      <SelectItem key={tr} value={tr}>{triggerLabel(tr)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newRule.trigger !== "new_invoice" && (
                <div><Label>{t("automation.rule_condition")}</Label><Input value={newRule.condition} onChange={e => setNewRule(p => ({ ...p, condition: e.target.value }))} placeholder={newRule.trigger === "amount_threshold" ? "e.g. 1000" : "e.g. pattern"} /></div>
              )}
              <div><Label>{t("automation.rule_action")}</Label>
                <Select value={newRule.action} onValueChange={v => setNewRule(p => ({ ...p, action: v as Action }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["add_tag","set_category","send_alert","flag_review"] as Action[]).map(ac => (
                      <SelectItem key={ac} value={ac}>{actionLabel(ac)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(newRule.action === "add_tag" || newRule.action === "set_category") && (
                <div><Label>{t("automation.action_value")}</Label><Input value={newRule.actionValue} onChange={e => setNewRule(p => ({ ...p, actionValue: e.target.value }))} placeholder={newRule.action === "add_tag" ? "Tag name" : "Category name"} /></div>
              )}
              <Button onClick={handleAdd} className="w-full">{t("automation.add_rule")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        {rules.map(r => (
          <Card key={r.id} className={`transition-all ${r.active ? "border-border" : "border-border/50 opacity-70"}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.matchCount} {t("automation.tag_matches").toLowerCase()}
                  </p>
                </div>
                <Switch checked={r.active} onCheckedChange={checked => setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: checked } : x))} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="gap-1 text-xs">
                  {TRIGGER_ICONS[r.trigger]}
                  {triggerLabel(r.trigger)}
                </Badge>
                {r.condition && (
                  <Badge variant="secondary" className="text-xs">
                    <code className="font-mono">{r.condition}</code>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">→</span>
                <Badge className="gap-1 text-xs">
                  {ACTION_ICONS[r.action]}
                  {actionLabel(r.action)}
                  {r.actionValue && <span className="font-normal">: {r.actionValue}</span>}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card><CardContent className="text-center text-muted-foreground py-12">{t("automation.no_rules")} {t("automation.create_first")}</CardContent></Card>
      )}
    </div>
  );
}
