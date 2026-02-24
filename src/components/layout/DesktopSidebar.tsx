import { Home, FileText, Wallet, Brain, Bell, Settings, Zap, CalendarClock, ShieldAlert, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

const navItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: "nav.home", url: "/", icon: Home },
  { titleKey: "nav.invoices", url: "/invoices", icon: FileText },
  { titleKey: "nav.finance", url: "/finance", icon: Wallet },
  { titleKey: "nav.ai", url: "/ai-insights", icon: Brain },
  { titleKey: "nav.alerts", url: "/alerts", icon: Bell },
  { titleKey: "nav.alert_rules", url: "/alert-rules", icon: ShieldAlert },
  { titleKey: "nav.fixed_costs", url: "/fixed-costs", icon: CalendarClock },
  { titleKey: "nav.cogs", url: "/cogs", icon: ShoppingCart },
  { titleKey: "nav.automation", url: "/automation", icon: Zap },
  { titleKey: "nav.settings", url: "/settings", icon: Settings },
];

export function DesktopSidebar() {
  const { t } = useLanguage();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border shrink-0">
        <img src="/4labs-logo.png" alt="4Labs" className="w-9 h-9 rounded-lg shrink-0" />
        <span className="text-lg font-bold font-display text-sidebar-primary">4Labs</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.titleKey}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
                activeClassName="bg-primary/15 text-primary font-medium"
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{t(item.titleKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
