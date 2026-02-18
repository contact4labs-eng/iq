import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const MONTH_NAMES = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const DAY_NAMES = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

interface DayData {
  revenue: number;
  expenses: number;
  profit: number;
}

interface ProfitabilityCalendarProps {
  refreshKey?: number;
}

export function ProfitabilityCalendar({ refreshKey = 0 }: ProfitabilityCalendarProps) {
  const { company } = useAuth();
  const companyId = company?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [revRes, expRes] = await Promise.all([
          supabase
            .from("revenue_entries")
            .select("amount, entry_date")
            .eq("company_id", companyId)
            .gte("entry_date", monthStart)
            .lte("entry_date", monthEnd),
          supabase
            .from("expense_entries")
            .select("amount, entry_date")
            .eq("company_id", companyId)
            .gte("entry_date", monthStart)
            .lte("entry_date", monthEnd),
        ]);

        const map = new Map<string, DayData>();

        for (const r of (revRes.data ?? []) as any[]) {
          const key = r.entry_date as string;
          const existing = map.get(key) || { revenue: 0, expenses: 0, profit: 0 };
          existing.revenue += safe(r.amount);
          existing.profit = existing.revenue - existing.expenses;
          map.set(key, existing);
        }

        for (const r of (expRes.data ?? []) as any[]) {
          const key = r.entry_date as string;
          const existing = map.get(key) || { revenue: 0, expenses: 0, profit: 0 };
          existing.expenses += safe(r.amount);
          existing.profit = existing.revenue - existing.expenses;
          map.set(key, existing);
        }

        setDayMap(map);
      } catch (err) {
        console.error("ProfitabilityCalendar fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId, monthStart, monthEnd, refreshKey]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    // Monday = 0, Sunday = 6
    let startDow = firstDayOfMonth.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) days.push(d);
    // Fill remaining to complete the week
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, month, lastDay]);

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedData = selectedDay ? dayMap.get(selectedDay) : null;

  const monthTotals = useMemo(() => {
    let rev = 0, exp = 0;
    for (const d of dayMap.values()) {
      rev += d.revenue;
      exp += d.expenses;
    }
    return { revenue: rev, expenses: exp, profit: rev - exp };
  }, [dayMap]);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Ημερολόγιο Κερδοφορίας</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const data = dayMap.get(dateStr);
                const profit = data ? data.profit : 0;
                const hasData = !!data;
                const isSelected = selectedDay === dateStr;
                const today = new Date();
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all border",
                      isSelected
                        ? "border-accent ring-1 ring-accent"
                        : "border-transparent",
                      hasData
                        ? profit > 0
                          ? "bg-success/15 text-success hover:bg-success/25"
                          : profit < 0
                          ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        : "bg-card text-muted-foreground/50 hover:bg-muted/30",
                      isToday && "ring-1 ring-accent/50"
                    )}
                  >
                    <span className={cn("font-medium", isToday && "font-bold text-accent")}>{day}</span>
                    {hasData && (
                      <span className="text-[9px] font-semibold leading-tight mt-0.5">
                        {profit >= 0 ? "+" : ""}{fmt(profit)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day tooltip */}
            {selectedData && selectedDay && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-semibold text-foreground mb-1.5">
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="flex gap-4 text-xs">
                  <span className="text-success">Έσοδα: {fmt(selectedData.revenue)}</span>
                  <span className="text-destructive">Έξοδα: {fmt(selectedData.expenses)}</span>
                  <span className={selectedData.profit >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    Κέρδος: {fmt(selectedData.profit)}
                  </span>
                </div>
              </div>
            )}

            {/* Month summary */}
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>Σύνολο μήνα:</span>
              <div className="flex gap-3">
                <span className="text-success">Έσοδα: {fmt(monthTotals.revenue)}</span>
                <span className="text-destructive">Έξοδα: {fmt(monthTotals.expenses)}</span>
                <span className={cn("font-semibold", monthTotals.profit >= 0 ? "text-success" : "text-destructive")}>
                  Κέρδος: {fmt(monthTotals.profit)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
