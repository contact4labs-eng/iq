import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/contexts/LanguageContext";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in">
            {children}
          </main>
          <footer className="border-t border-border px-4 py-3 text-center bg-card/50">
            <span className="text-xs text-muted-foreground">{t("footer.made_with")} <span className="font-semibold text-primary">InvoiceIQ</span></span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
