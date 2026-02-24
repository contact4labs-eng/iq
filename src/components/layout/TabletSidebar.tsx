import { useState } from "react";
import { Home, FileText, Wallet, Brain, Settings, Zap, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const navItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: "nav.home", url: "/", icon: Home },
  { titleKey: "nav.invoices", url: "/invoices", icon: FileText },
  { titleKey: "nav.finance", url: "/finance", icon: Wallet },
  { titleKey: "nav.ai", url: "/ai-insights", icon: Brain },
{ titleKey: "nav.cogs", url: "/cogs", icon: ShoppingCart },
  { titleKey: "nav.automation", url: "/automation", icon: Zap },
  { titleKey: "nav.settings", url: "/settings", icon: Settings },
];

export function TabletSidebar() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="hidden md:block lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setExpanded(false)}
        />
      )}

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "hidden md:flex lg:hidden fixed inset-y-0 left-0 z-40 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          expanded ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border shrink-0 overflow-hidden">
          <img src="/4labs-logo.png" alt="4Labs" className="w-9 h-9 rounded-lg shrink-0" />
          {expanded && (
            <span className="text-lg font-bold font-display text-sidebar-primary whitespace-nowrap">4Labs</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.titleKey}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground hover:bg-primary/10 hover:text-foreground transition-colors",
                    expanded ? "px-3 py-2.5" : "justify-center p-2.5"
                  )}
                  activeClassName="bg-primary/15 text-primary font-medium"
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {expanded && <span className="whitespace-nowrap">{t(item.titleKey)}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
