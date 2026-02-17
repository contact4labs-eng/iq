import { useState, useEffect } from "react";
import { Settings, Save, LogOut, Download, KeyRound, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface CompanyInfo {
  name: string;
  afm: string;
  email: string;
  phone: string;
  address: string;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SettingsPage = () => {
  const { user, company, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const companyId = company?.id;

  const [info, setInfo] = useState<CompanyInfo>({ name: "", afm: "", email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("companies")
      .select("name, afm, email, phone, address")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setInfo(data as CompanyInfo);
        setLoading(false);
      });
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update(info).eq("id", companyId);
    setSaving(false);
    if (error) toast({ title: "Σφάλμα", description: error.message, variant: "destructive" });
    else toast({ title: "Επιτυχία", description: "Οι ρυθμίσεις αποθηκεύτηκαν" });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) toast({ title: "Σφάλμα", description: error.message, variant: "destructive" });
    else toast({ title: "Επιτυχία", description: "Σύνδεσμος αλλαγής κωδικού στάλθηκε στο email σας" });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleExport = async (table: string, filename: string) => {
    if (!companyId) return;
    setExporting(table);
    const { data, error } = await supabase.from(table).select("*").eq("company_id", companyId);
    setExporting(null);
    if (error) { toast({ title: "Σφάλμα", description: error.message, variant: "destructive" }); return; }
    if (!data?.length) { toast({ title: "Κενά δεδομένα", description: "Δεν βρέθηκαν εγγραφές" }); return; }
    downloadCsv(filename, data as Record<string, unknown>[]);
    toast({ title: "Επιτυχία", description: `Εξαγωγή ${filename}` });
  };

  const field = (label: string, key: keyof CompanyInfo, placeholder: string) => (
    <div key={key}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input
        className="mt-1"
        placeholder={placeholder}
        value={info[key]}
        onChange={(e) => setInfo((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">Ρυθμίσεις</h1>
          </div>
          <p className="text-muted-foreground">Ρυθμίσεις λογαριασμού και επιχείρησης</p>
        </div>

        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Στοιχεία Επιχείρησης</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
            ) : (
              <>
                {field("Επωνυμία", "name", "Όνομα εταιρείας")}
                {field("ΑΦΜ", "afm", "123456789")}
                {field("Email", "email", "info@company.gr")}
                {field("Τηλέφωνο", "phone", "210 1234567")}
                {field("Διεύθυνση", "address", "Οδός, Πόλη")}
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? "Αποθήκευση..." : "Αποθήκευση"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Λογαριασμός</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <Input className="mt-1" value={user?.email ?? ""} disabled />
            </div>
            <Separator />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handlePasswordReset} className="gap-1.5">
                <KeyRound className="w-4 h-4" /> Αλλαγή κωδικού
              </Button>
              <Button variant="destructive" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="w-4 h-4" /> Αποσύνδεση
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Εξαγωγή Δεδομένων</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["invoices", "invoices.csv", "Τιμολόγια"],
                ["expense_entries", "expenses.csv", "Έξοδα"],
                ["revenue_entries", "revenue.csv", "Έσοδα"],
              ] as const).map(([table, file, label]) => (
                <Button
                  key={table}
                  variant="outline"
                  className="h-12 gap-1.5"
                  disabled={exporting === table}
                  onClick={() => handleExport(table, file)}
                >
                  {exporting === table ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {label} CSV
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
