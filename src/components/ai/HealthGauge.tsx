import { cn } from "@/lib/utils";

interface HealthGaugeProps {
  score: number;
}

export function HealthGauge({ score }: HealthGaugeProps) {
  const clamp = Math.max(0, Math.min(100, score));
  const angle = (clamp / 100) * 180;
  const color =
    clamp < 40 ? "text-destructive" : clamp < 60 ? "text-warning" : clamp < 75 ? "text-[hsl(50,80%,50%)]" : "text-success";

  // SVG semi-circle gauge
  const radius = 70;
  const cx = 80;
  const cy = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamp / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="95" viewBox="0 0 160 95">
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
        />
      </svg>
      <span className={cn("text-4xl font-bold font-display -mt-6", color)}>{clamp}</span>
      <span className="text-sm text-muted-foreground mt-1">Health Score</span>
    </div>
  );
}
