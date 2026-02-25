import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const safe = (v: unknown): number => (v == null || isNaN(Number(v))) ? 0 : Number(v);

function fmt(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const MONTH_KEYS: TranslationKey[] = [
  "calendar.month_jan", "calendar.month_feb", "calendar.month_mar", "calendar.month_apr",
  "calendar.month_may", "calendar.month_jun", "calendar.month_jul", "calendar.month_aug",
  "calendar.month_sep", "calendar.month_oct", "calendar.month_nov", "calendar.month_dec",
];

const DAY_KEYS: TranslationKey[] = [
  "calendar.day_mon", "calendar.day_tue", "calendar.day_wed", "calendar.day_thu",
  "calendar.day_fri", "calendar.day_sat", "calendar.day_sun",
];

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
  const { t, language } = useLanguage();
  const companyId = company?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEndRaw = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  // Never fetch beyond today — prevents showing data on future dates
  const monthEnd = monthEndRaw > todayStr ? todayStr : monthEndRaw;

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [revRes, expRes] = await Promise.all([
          supabase.from("revenue_entries").select("amount, entry_date").eq("company_id", companyId).gte("entry_date", monthStart).lte("entry_date", monthEnd),
          supabase.from("expense_entries").select("amount, entry_date").eq("company_id", companyId).gte("entry_date", monthStart).lte("entry_date", monthEnd),
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
    let startDow = firstDayOfMonth.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, month, lastDay]);

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const isFutureMonth = year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth());
  const goToNextMonth = () => {
    if (!isFutureMonth) setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectedData = selectedDay ? dayMap.get(selectedDay) : null;

  const monthTotals = useMemo(() => {
    let rev = 0, exp = 0;
    for (const d of dayMap.values()) {
      rev += d.revenue;
      exp += d.expenses;
    }
    return { revenue: rev, expenses: exp, profit: rev - exp };
  }, [dayMap]);

  const dateLocale = language === "en" ? "en-GB" : "el-GR";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">{t("calendar.title")}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
              {t(MONTH_KEYS[month])} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth} disabled={isFutureMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_KEYS.map((key) => (
                <div key={key} className="text-center text-xs font-semibold text-muted-foreground py-1">
                  {t(key)}
                </div>
              ))}
            </div>

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
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isFutureDay = isCurrentMonth && day > today.getDate();

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFutureDay && setSelectedDay(isSelected ? null : dateStr)}
                    disabled={isFutureDay}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all border",
                      isSelected ? "border-accent ring-1 ring-accent" : "border-transparent",
                      isFutureDay
                        ? "bg-card text-muted-foreground/25 cursor-default"
                        : hasData
                          ? profit > 0 ? "bg-success/15 text-success hover:bg-success/25"
                            : profit < 0 ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          : "bg-card text-muted-foreground/50 hover:bg-muted/30",
                      isToday && "ring-1 ring-accent/50"
                    )}
                  >
                    <span className={cn("font-medium", isToday && "font-bold text-accent")}>{day}</span>
                    {hasData && !isFutureDay && (
                      <span className="text-[9px] font-semibold leading-tight mt-0.5">
                        {profit >= 0 ? "+" : ""}{fmt(profit)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedData && selectedDay && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-semibold text-foreground mb-1.5">
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="flex gap-4 text-xs">
                  <span className="text-success">{t("dashboard.revenue")}: {fmt(selectedData.revenue)}</span>
                  <span className="text-destructive">{t("dashboard.expenses")}: {fmt(selectedData.expenses)}</span>
                  <span className={selectedData.profit >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    {t("dashboard.profit")}: {fmt(selectedData.profit)}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>{t("calendar.month_total")}</span>
              <div className="flex gap-3">
                <span className="text-success">{t("dashboard.revenue")}: {fmt(monthTotals.revenue)}</span>
                <span className="text-destructive">{t("dashboard.expenses")}: {fmt(monthTotals.expenses)}</span>
                <span className={cn("font-semibold", monthTotals.profit >= 0 ? "text-success" : "text-destructive")}>
                  {t("dashboard.profit")}: {fmt(monthTotals.profit)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
