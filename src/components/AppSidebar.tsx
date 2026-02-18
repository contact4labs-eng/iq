import { Home, FileText, Wallet, Brain, TrendingUp, Bell, Settings, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: "nav.home", url: "/", icon: Home },
  { titleKey: "nav.invoices", url: "/invoices", icon: FileText },
  { titleKey: "nav.finance", url: "/finance", icon: Wallet },
  { titleKey: "nav.ai", url: "/ai-insights", icon: Brain },
  { titleKey: "nav.analytics", url: "/analytics", icon: TrendingUp },
  { titleKey: "nav.alerts", url: "/alerts", icon: Bell },
  { titleKey: "nav.automation", url: "/automation", icon: Zap },
  { titleKey: "nav.settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useLanguage();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-ring flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-accent-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold font-display text-sidebar-primary">
              InvoiceIQ
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild tooltip={t(item.titleKey)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="text-sidebar-foreground hover:bg-[rgba(59,130,246,0.08)] hover:text-foreground transition-colors"
                      activeClassName="bg-[rgba(59,130,246,0.1)] text-white font-medium border-l-2 border-primary"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{t(item.titleKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
