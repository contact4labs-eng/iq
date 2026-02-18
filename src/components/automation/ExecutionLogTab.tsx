import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Search, CalendarDays } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  ruleName: string;
  invoiceRef: string;
  actionTaken: string;
  status: "success" | "failed";
}

const DEMO_LOG: LogEntry[] = [
  { id: 1, timestamp: "2026-02-18 14:32", ruleName: "Tag invoices from ΔΕΚΟ as Utilities", invoiceRef: "INV-2026-0142", actionTaken: "Set Category: Utilities", status: "success" },
  { id: 2, timestamp: "2026-02-18 14:32", ruleName: "Flag invoices over 1000 EUR", invoiceRef: "INV-2026-0142", actionTaken: "Flag for Review", status: "success" },
  { id: 3, timestamp: "2026-02-17 09:15", ruleName: "Auto-categorize by supplier", invoiceRef: "INV-2026-0139", actionTaken: "Set Category: Food & Beverage", status: "success" },
  { id: 4, timestamp: "2026-02-17 09:15", ruleName: "Tag Software subscriptions", invoiceRef: "INV-2026-0139", actionTaken: "Add Tag: Software", status: "failed" },
  { id: 5, timestamp: "2026-02-16 16:45", ruleName: "Flag invoices over 1000 EUR", invoiceRef: "INV-2026-0135", actionTaken: "Flag for Review", status: "success" },
  { id: 6, timestamp: "2026-02-16 11:20", ruleName: "Tag Software subscriptions", invoiceRef: "INV-2026-0133", actionTaken: "Add Tag: Software", status: "success" },
  { id: 7, timestamp: "2026-02-15 10:00", ruleName: "Tag invoices from ΔΕΚΟ as Utilities", invoiceRef: "INV-2026-0130", actionTaken: "Set Category: Utilities", status: "success" },
  { id: 8, timestamp: "2026-02-14 15:30", ruleName: "Auto-categorize by supplier", invoiceRef: "INV-2026-0128", actionTaken: "Set Category: Services", status: "failed" },
  { id: 9, timestamp: "2026-02-18 15:10", ruleName: "Duplicate Invoice Detection", invoiceRef: "INV-2026-0143", actionTaken: "Flag Duplicate", status: "success" },
  { id: 10, timestamp: "2026-02-18 12:00", ruleName: "Payment Reminder Workflow", invoiceRef: "INV-2026-0138", actionTaken: "Send Reminder", status: "success" },
  { id: 11, timestamp: "2026-02-17 17:30", ruleName: "Budget Threshold Alert", invoiceRef: "INV-2026-0140", actionTaken: "Notify Admin", status: "success" },
  { id: 12, timestamp: "2026-02-17 10:45", ruleName: "High-Value Approval Workflow", invoiceRef: "INV-2026-0141", actionTaken: "Require Approval", status: "failed" },
  { id: 13, timestamp: "2026-02-16 14:20", ruleName: "Anomaly Detection", invoiceRef: "INV-2026-0136", actionTaken: "Flag Anomaly", status: "success" },
];

export function ExecutionLogTab() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRule, setFilterRule] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const ruleNames = useMemo(() => {
    return Array.from(new Set(DEMO_LOG.map(e => e.ruleName))).sort();
  }, []);

  const filtered = useMemo(() => {
    return DEMO_LOG.filter(e => {
      if (filterRule !== "all" && e.ruleName !== filterRule) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.ruleName.toLowerCase().includes(q) && !e.invoiceRef.toLowerCase().includes(q) && !e.actionTaken.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, filterRule, filterStatus]);

  const successCount = DEMO_LOG.filter(e => e.status === "success").length;
  const failedCount = DEMO_LOG.filter(e => e.status === "failed").length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("automation.log_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("automation.log_desc")}</p>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className="text-xs gap-1.5 px-3 py-1">
          {t("automation.log_total")}: {DEMO_LOG.length}
        </Badge>
        <Badge className="text-xs gap-1.5 px-3 py-1 bg-success/10 text-success border-success/20 hover:bg-success/15">
          <CheckCircle className="w-3 h-3" />
          {successCount} {t("automation.log_success")}
        </Badge>
        <Badge className="text-xs gap-1.5 px-3 py-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15">
          <XCircle className="w-3 h-3" />
          {failedCount} {t("automation.log_failed")}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("automation.log_search")}
            className="pl-9"
          />
        </div>
        <Select value={filterRule} onValueChange={setFilterRule}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t("automation.log_filter_rule")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("automation.log_all_rules")}</SelectItem>
            {ruleNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("automation.rule_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("automation.log_all_status")}</SelectItem>
            <SelectItem value="success">{t("automation.log_success")}</SelectItem>
            <SelectItem value="failed">{t("automation.log_failed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">
                  <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{t("automation.log_date")}</div>
                </TableHead>
                <TableHead>{t("automation.rule_name")}</TableHead>
                <TableHead>{t("automation.log_invoice")}</TableHead>
                <TableHead>{t("automation.log_action")}</TableHead>
                <TableHead className="text-center">{t("automation.rule_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{e.timestamp}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{e.ruleName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">{e.invoiceRef}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.actionTaken}</TableCell>
                  <TableCell className="text-center">
                    {e.status === "success" ? (
                      <Badge className="gap-1 text-xs bg-success/10 text-success border-success/20 hover:bg-success/15">
                        <CheckCircle className="w-3 h-3" />
                        {t("automation.log_success")}
                      </Badge>
                    ) : (
                      <Badge className="gap-1 text-xs bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15">
                        <XCircle className="w-3 h-3" />
                        {t("automation.log_failed")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("automation.log_empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
