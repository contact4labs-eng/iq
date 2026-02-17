import { useState } from "react";
import { Home, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { WeeklySummary } from "@/components/dashboard/WeeklySummary";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { dailyKpis, weeklyKpis, recentInvoices, loading, error } = useDashboardData();
  const { toast } = useToast();

  const handleModalPlaceholder = (name: string) => {
    toast({ title: name, description: "Αυτή η λειτουργία θα προστεθεί σύντομα." });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Home className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">Αρχική</h1>
          </div>
          <p className="text-muted-foreground">Κέντρο ελέγχου επιχείρησης</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Διαθέσιμα μετρητά"
            value={dailyKpis?.cash_position ?? null}
            trend={dailyKpis?.cash_position_trend}
            loading={loading}
          />
          <KpiCard
            label="Εκκρεμείς πληρωμές"
            value={dailyKpis?.pending_outgoing ?? null}
            trend={dailyKpis?.pending_outgoing_trend}
            loading={loading}
          />
          <KpiCard
            label="Κέρδος MTD"
            value={dailyKpis?.mtd_profit ?? null}
            trend={dailyKpis?.mtd_profit_trend}
            loading={loading}
          />
          <KpiCard
            label="Ληξιπρόθεσμα"
            value={dailyKpis?.overdue_amount ?? null}
            trend={dailyKpis?.overdue_trend}
            loading={loading}
            isNegativeHighlight
          />
        </div>

        {/* Middle — Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WeeklySummary data={weeklyKpis} loading={loading} />
          <RecentInvoices invoices={recentInvoices} loading={loading} />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Γρήγορες ενέργειες</h3>
          <QuickActions
            onRevenueModal={() => handleModalPlaceholder("Καταχώρηση εσόδων")}
            onExpenseModal={() => handleModalPlaceholder("Καταχώρηση εξόδων")}
            onCashModal={() => handleModalPlaceholder("Ταμείο")}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
