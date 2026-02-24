import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        toast({ title: t("toast.login_error"), description: error.message, variant: "destructive" });
        return;
      }
      // Don't navigate manually — onAuthStateChange will update user state,
      // then PublicRoute will automatically redirect to "/" once user is set.
      // Keep loading=true so the button stays disabled during the redirect.
    } catch (err) {
      setLoading(false);
      toast({
        title: t("toast.login_error"),
        description: err instanceof Error ? err.message : t("toast.login_error"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/4labs-logo.png" alt="4Labs" className="w-11 h-11 rounded-lg" />
            <h1 className="text-2xl font-bold font-display text-foreground">4Labs</h1>
          </div>
          <p className="text-muted-foreground">{t("auth.login_title")}</p>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" placeholder="info@company.gr" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("auth.login_button")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t("auth.no_account")}{" "}
            <Link to="/register" className="text-accent hover:underline font-medium">{t("auth.register_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
