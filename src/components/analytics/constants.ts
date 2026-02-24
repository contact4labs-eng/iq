// Shared analytics color palette and chart configuration
export const ANALYTICS_COLORS = [
  "hsl(217, 91%, 60%)",   // Blue (primary)
  "hsl(152, 56%, 45%)",   // Green (success)
  "hsl(38, 92%, 50%)",    // Amber (warning)
  "hsl(0, 72%, 51%)",     // Red (destructive)
  "hsl(270, 50%, 55%)",   // Purple
  "hsl(180, 60%, 45%)",   // Teal
  "hsl(330, 60%, 55%)",   // Pink
  "hsl(60, 70%, 50%)",    // Yellow
];

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

export const CHART_LABEL_STYLE = {
  color: "hsl(var(--foreground))",
};

export function formatCurrency(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(v ?? 0);
}

export function formatCurrencyShort(v: number | null | undefined) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v ?? 0);
}

export function formatMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.length <= 7 ? "-01" : ""));
    return d.toLocaleDateString("el-GR", { month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Filter out dates that are clearly wrong (> 1 month in the future) */
export function isValidDate(dateStr: string): boolean {
  try {
    const d = new Date(dateStr + (dateStr.length <= 7 ? "-01" : ""));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() + 1);
    return d <= cutoff;
  } catch {
    return false;
  }
}

/** Sort date strings chronologically */
export function sortByDate(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

export type DateRangePreset = "30d" | "90d" | "6m" | "1y" | "all";

export function getDateRangeStart(preset: DateRangePreset): Date | null {
  if (preset === "all") return null;
  const now = new Date();
  switch (preset) {
    case "30d": now.setDate(now.getDate() - 30); break;
    case "90d": now.setDate(now.getDate() - 90); break;
    case "6m": now.setMonth(now.getMonth() - 6); break;
    case "1y": now.setFullYear(now.getFullYear() - 1); break;
  }
  return now;
}
