import { useState } from "react";
import { Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useFinanceData } from "@/hooks/useFinanceData";
import { MonthlyProfitCard } from "@/components/finance/MonthlyProfitCard";
import { DailySnapshotCards } from "@/components/finance/DailySnapshotCards";
import { WeeklyPerformanceCard } from "@/components/finance/WeeklyPerformanceCard";
import { CashFlowChart } from "@/components/finance/CashFlowChart";
import { ExpenseBreakdownChart } from "@/components/finance/ExpenseBreakdownChart";
import { ProfitPressureCard } from "@/components/finance/ProfitPressureCard";
import { FinanceQuickActions } from "@/components/finance/FinanceQuickActions";
import { Skeleton } from "@/components/ui/skeleton";

const Finance = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { monthly, daily, weekly, cashFlow, expenseBreakdown, profitPressure, loading, error } = useFinanceData(refreshKey);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-display text-foreground">Χρήματα</h1>
          </div>
          <p className="text-muted-foreground">Οικονομική επισκόπηση και ταμειακές ροές</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-lg" />
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <>
            <MonthlyProfitCard data={monthly} />
            <DailySnapshotCards data={daily} />
            <WeeklyPerformanceCard data={weekly} />
            <CashFlowChart data={cashFlow} />
            <ExpenseBreakdownChart data={expenseBreakdown} />
            <ProfitPressureCard data={profitPressure} />
            <FinanceQuickActions onDataChanged={() => setRefreshKey((k) => k + 1)} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Finance;
