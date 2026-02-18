import { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { TabletSidebar } from "@/components/layout/TabletSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ResponsiveHeader } from "@/components/layout/ResponsiveHeader";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex w-full">
      <DesktopSidebar />
      <TabletSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-16 lg:ml-64">
        <ResponsiveHeader />
        <main className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in pb-20 md:pb-6">
          {children}
        </main>
        <footer className="hidden md:block border-t border-border px-4 py-3 text-center bg-card/50">
          <span className="text-xs text-muted-foreground">
            {t("footer.made_with")} <span className="font-semibold text-primary">InvoiceIQ</span>
          </span>
        </footer>
      </div>

      <MobileBottomNav />
    </div>
  );
}
