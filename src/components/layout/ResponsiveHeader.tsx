import { Bell, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export function ResponsiveHeader() {
  const { user, company, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const companyName = company?.name || t("topbar.my_company");

  return (
    <header className="h-14 border-b border-topbar-border bg-topbar flex items-center justify-between px-4 shrink-0">
      {/* Mobile: centered title */}
      <div className="flex items-center gap-2 md:hidden">
        <img src="/4labs-logo.png" alt="4Labs" className="w-7 h-7 rounded-md" />
        <span className="text-base font-bold font-display text-foreground">4Labs</span>
      </div>

      {/* Tablet/Desktop: company name or spacer */}
      <div className="hidden md:flex items-center">
        <span className="text-sm font-medium text-topbar-foreground">{companyName}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
          onClick={() => setLanguage(language === "el" ? "en" : "el")}
          title={language === "el" ? "English" : "Ελληνικά"}
        >
          <span className="text-xs font-bold">{language === "el" ? "EN" : "ΕΛ"}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
          onClick={toggleTheme}
          title={theme === "dark" ? t("topbar.light_theme") : t("topbar.dark_theme")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
          onClick={() => navigate("/notifications")}
        >
          <Bell className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
