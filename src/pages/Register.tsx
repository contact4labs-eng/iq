import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, Loader2 } from "lucide-react";

const Register = () => {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [afm, setAfm] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Greek AFM MOD11 checksum validation
  const isValidAfm = (afm: string): boolean => {
    if (afm.length !== 9 || !/^\d+$/.test(afm)) return false;
    if (afm === "000000000") return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(afm[i], 10) * Math.pow(2, 8 - i);
    }
    const remainder = sum % 11;
    const checkDigit = remainder % 10;
    return checkDigit === parseInt(afm[8], 10);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAfm(afm)) {
      toast({ title: t("toast.invalid_afm"), description: t("toast.afm_digits"), variant: "destructive" });
      return;
    }
    if (password.length < 10) {
      toast({ title: t("toast.error"), description: t("toast.password_too_short"), variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          company_name: companyName,
          afm,
        },
      },
    });
    
    if (authError) {
      setLoading(false);
      toast({ title: t("toast.register_error"), description: authError.message, variant: "destructive" });
      return;
    }

    if (authData.user) {
      const { error: companyError } = await supabase
        .from("companies")
        .insert({
          owner_user_id: authData.user.id,
          name: companyName,
          afm,
        });

      if (companyError) {
        logger.error("Company creation error:", companyError);
        // Check if company already exists (idempotency guard against duplicates)
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_user_id", authData.user.id)
          .maybeSingle();

        if (!existingCompany) {
          // Company truly doesn't exist — retry once
          const { error: retryError } = await supabase
            .from("companies")
            .insert({
              owner_user_id: authData.user.id,
              name: companyName,
              afm,
            });

          if (retryError) {
            logger.error("Company creation retry also failed:", retryError);
            await supabase.auth.signOut();
            setLoading(false);
            toast({
              title: t("toast.error"),
              description: t("toast.register_error"),
              variant: "destructive",
            });
            return;
          }
        }
        // If existingCompany found, company was created — continue normally
      }
    }

    setLoading(false);
    toast({ title: t("toast.register_success"), description: t("toast.check_email") });
    navigate("/login");
    } catch (err) {
      logger.error("Registration error:", err);
      setLoading(false);
      toast({
        title: t("toast.register_error"),
        description: err instanceof Error ? err.message : "\u0391\u03C0\u03C1\u03CC\u03C3\u03BC\u03B5\u03BD\u03BF \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1. \u0394\u03BF\u03BA\u03B9\u03BC\u03AC\u03C3\u03C4\u03B5 \u03BE\u03B1\u03BD\u03AC.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">InvoiceIQ</h1>
          </div>
          <p className="text-muted-foreground">{t("auth.register_title")}</p>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">{t("auth.company_name")}</Label>
              <Input id="company" placeholder={t("auth.company_placeholder")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afm">{t("settings.afm")}</Label>
              <Input id="afm" placeholder="123456789" maxLength={9} value={afm} onChange={(e) => setAfm(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" placeholder="info@company.gr" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("auth.register_button")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t("auth.has_account")}{" "}
            <Link to="/login" className="text-accent hover:underline font-medium">{t("auth.login_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
