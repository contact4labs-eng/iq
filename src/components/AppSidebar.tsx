import { Home, FileText, Wallet, Brain, Bell, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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

const navItems = [
  { title: "Αρχική", url: "/", icon: Home },
  { title: "Τιμολόγια", url: "/invoices", icon: FileText },
  { title: "Χρήματα", url: "/finance", icon: Wallet },
  { title: "AI Ανάλυση", url: "/ai-insights", icon: Brain },
  { title: "Ειδοποιήσεις", url: "/alerts", icon: Bell },
  { title: "Ρυθμίσεις", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
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
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="text-sidebar-foreground hover:bg-[rgba(59,130,246,0.08)] hover:text-foreground transition-colors"
                      activeClassName="bg-[rgba(59,130,246,0.1)] text-white font-medium border-l-2 border-primary"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
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
