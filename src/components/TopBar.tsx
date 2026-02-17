import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  const { user, company, signOut } = useAuth();
  const companyName = company?.name || "Η εταιρεία μου";
  const email = user?.email || "";

  return (
    <header className="h-14 border-b border-topbar-border bg-topbar flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-topbar-foreground" />
        <span className="text-sm font-medium text-topbar-foreground hidden sm:inline">{companyName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden md:inline">{email}</span>
        <Button variant="ghost" size="icon" className="text-topbar-foreground relative">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-topbar-foreground" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
