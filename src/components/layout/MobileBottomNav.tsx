import { Home, FileText, Zap, MoreHorizontal, Wallet, Brain, Settings, CalendarClock, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const primaryItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: "nav.home", url: "/", icon: Home },
  { titleKey: "nav.invoices", url: "/invoices", icon: FileText },
  { titleKey: "nav.finance", url: "/finance", icon: Wallet },
  { titleKey: "nav.automation", url: "/automation", icon: Zap },
];

const moreItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: "nav.ai", url: "/ai-insights", icon: Brain },
  { titleKey: "nav.fixed_costs", url: "/fixed-costs", icon: CalendarClock },
  { titleKey: "nav.cogs", url: "/cogs", icon: ShoppingCart },
{ titleKey: "nav.settings", url: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-full px-1">
          {primaryItems.map((item) => (
            <NavLink
              key={item.titleKey}
              to={item.url}
              end={item.url === "/"}
              className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] gap-0.5 text-muted-foreground"
              activeClassName="text-primary"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">{t(item.titleKey)}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] gap-0.5 text-muted-foreground"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] leading-tight">{t("nav.more")}</span>
          </button>
        </div>
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("nav.more")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 grid grid-cols-2 gap-3">
            {moreItems.map((item) => (
              <NavLink
                key={item.titleKey}
                to={item.url}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
                activeClassName="bg-primary/15 text-primary font-medium"
                onClick={() => setOpen(false)}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{t(item.titleKey)}</span>
              </NavLink>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
