import { Bell, LogOut, Sun, Moon, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  const { user, company, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const companyName = company?.name || t("topbar.my_company");
  const email = user?.email || "";

  return (
    <header className="h-14 border-b border-topbar-border bg-topbar flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-topbar-foreground" />
        <span className="text-sm font-medium text-topbar-foreground hidden sm:inline">{companyName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden md:inline">{email}</span>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setLanguage(language === "el" ? "en" : "el")}
          title={language === "el" ? "English" : "Ελληνικά"}
        >
          <span className="text-xs font-bold">{language === "el" ? "EN" : "ΕΛ"}</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={toggleTheme} title={theme === "dark" ? t("topbar.light_theme") : t("topbar.dark_theme")}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative" onClick={() => navigate("/notifications")}>
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
