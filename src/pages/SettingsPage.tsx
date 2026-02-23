import { useState, useEffect } from "react";
import { Settings, Save, LogOut, Download, KeyRound, Loader2, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const companyId = company?.id;

  const [info, setInfo] = useState<CompanyInfo>({ name: "", afm: "", email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("companies")
      .select("name, afm, email, phone, address")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error("Settings fetch error:", fetchErr.message);
          toast({ title: t("toast.error"), description: fetchErr.message, variant: "destructive" });
        } else if (data) {
          setInfo(data as CompanyInfo);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Settings fetch exception:", err);
        setLoading(false);
      });
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update(info).eq("id", companyId);
    setSaving(false);
    if (error) toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
    else toast({ title: t("toast.success"), description: t("toast.settings_saved") });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
    else toast({ title: t("toast.success"), description: t("toast.password_reset") });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const EXPORT_LIMIT = 10_000;

  const handleExport = async (table: string, filename: string) => {
    if (!companyId) return;
    setExporting(table);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(EXPORT_LIMIT);
    setExporting(null);
    if (error) { toast({ title: t("toast.error"), description: error.message, variant: "destructive" }); return; }
    if (!data?.length) { toast({ title: t("toast.empty_data"), description: t("toast.no_records") }); return; }
    if (data.length >= EXPORT_LIMIT) {
      toast({ title: t("toast.export_truncated") || "Export truncated", description: `${EXPORT_LIMIT} rows max`, variant: "destructive" });
    }
    downloadCsv(filename, data as Record<string, unknown>[]);
    toast({ title: t("toast.success"), description: `${t("toast.export_success")} ${filename}` });
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
            <h1 className="text-2xl font-bold font-display text-foreground">{t("nav.settings")}</h1>
          </div>
          <p className="text-muted-foreground">{t("settings.subtitle")}</p>
        </div>

        {/* Language */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="w-4 h-4" /> {t("settings.language")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={language === "el" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("el")}
              >
                🇬🇷 Ελληνικά
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
              >
                🇬🇧 English
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("settings.company_info")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
            ) : (
              <>
                {field(t("settings.company_name"), "name", t("settings.company_name_placeholder"))}
                {field(t("settings.afm"), "afm", "123456789")}
                {field(t("settings.email"), "email", "info@company.gr")}
                {field(t("settings.phone"), "phone", "210 1234567")}
                {field(t("settings.address"), "address", t("settings.address_placeholder"))}
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? t("settings.saving") : t("settings.save")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("settings.account")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">{t("settings.email")}</Label>
              <Input className="mt-1" value={user?.email ?? ""} disabled />
            </div>
            <Separator />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handlePasswordReset} className="gap-1.5">
                <KeyRound className="w-4 h-4" /> {t("settings.change_password")}
              </Button>
              <Button variant="destructive" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="w-4 h-4" /> {t("settings.sign_out")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("settings.data_export")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["invoices", "invoices.csv", t("settings.invoices_csv")],
                ["expense_entries", "expenses.csv", t("settings.expenses_csv")],
                ["revenue_entries", "revenue.csv", t("settings.revenue_csv")],
              ] as const).map(([table, file, label]) => (
                <Button
                  key={table}
                  variant="outline"
                  className="h-12 gap-1.5"
                  disabled={exporting === table}
                  onClick={() => handleExport(table, file)}
                >
                  {exporting === table ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {label}
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
