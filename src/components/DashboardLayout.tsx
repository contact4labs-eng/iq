import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in">
            {children}
          </main>
          <footer className="border-t border-border px-4 py-3 text-center">
            <span className="text-xs text-muted-foreground">Made with <span className="font-semibold text-accent">InvoiceIQ</span></span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
