import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Star, Puzzle, Zap, XCircle } from "lucide-react";

interface MatrixProduct {
  id: string;
  name: string;
  category: string;
  marginPct: number;
  contribution: number; // absolute profit €
}

interface MenuMatrixProps {
  products: MatrixProduct[];
}

type Quadrant = "star" | "puzzle" | "plowhorse" | "dog";

const QUADRANT_CONFIG: Record<
  Quadrant,
  {
    icon: typeof Star;
    bg: string;
    border: string;
    text: string;
    label: { el: string; en: string };
    desc: { el: string; en: string };
  }
> = {
  star: {
    icon: Star,
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
    label: { el: "Αστέρια", en: "Stars" },
    desc: { el: "Υψηλό κέρδος & αξία", en: "High margin & contribution" },
  },
  puzzle: {
    icon: Puzzle,
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    label: { el: "Γρίφοι", en: "Puzzles" },
    desc: { el: "Υψηλό κέρδος, χαμηλή αξία", en: "High margin, low contribution" },
  },
  plowhorse: {
    icon: Zap,
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    label: { el: "Βόδια", en: "Plowhorses" },
    desc: { el: "Χαμηλό κέρδος, υψηλή αξία", en: "Low margin, high contribution" },
  },
  dog: {
    icon: XCircle,
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
    label: { el: "Σκυλιά", en: "Dogs" },
    desc: { el: "Χαμηλό κέρδος & αξία", en: "Low margin & contribution" },
  },
};

export function MenuMatrix({ products }: MenuMatrixProps) {
  const { language } = useLanguage();

  const { quadrants, avgMargin, avgContribution } = useMemo(() => {
    if (products.length === 0) {
      return {
        quadrants: { star: [], puzzle: [], plowhorse: [], dog: [] } as Record<Quadrant, MatrixProduct[]>,
        avgMargin: 0,
        avgContribution: 0,
      };
    }

    const avgM = products.reduce((s, p) => s + p.marginPct, 0) / products.length;
    const avgC = products.reduce((s, p) => s + p.contribution, 0) / products.length;

    const q: Record<Quadrant, MatrixProduct[]> = { star: [], puzzle: [], plowhorse: [], dog: [] };

    for (const p of products) {
      const highMargin = p.marginPct >= avgM;
      const highContribution = p.contribution >= avgC;

      if (highMargin && highContribution) q.star.push(p);
      else if (highMargin && !highContribution) q.puzzle.push(p);
      else if (!highMargin && highContribution) q.plowhorse.push(p);
      else q.dog.push(p);
    }

    return { quadrants: q, avgMargin: avgM, avgContribution: avgC };
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {language === "el" ? "Δεν υπάρχουν προϊόντα με κόστος για ανάλυση." : "No products with cost data to analyze."}
      </div>
    );
  }

  const renderQuadrant = (key: Quadrant) => {
    const cfg = QUADRANT_CONFIG[key];
    const Icon = cfg.icon;
    const items = quadrants[key];

    return (
      <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3 space-y-2 min-h-[120px]`}>
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
          <span className={`text-xs font-semibold ${cfg.text}`}>
            {cfg.label[language]} ({items.length})
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{cfg.desc[language]}</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="truncate flex-1 mr-2">{p.name}</span>
              <span className="font-mono text-muted-foreground shrink-0">
                {p.marginPct.toFixed(0)}% · €{p.contribution.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {language === "el" ? "Μέσο κέρδος" : "Avg margin"}: {avgMargin.toFixed(1)}%
        </span>
        <span>
          {language === "el" ? "Μέση συνεισφορά" : "Avg contribution"}: €{avgContribution.toFixed(2)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {renderQuadrant("star")}
        {renderQuadrant("puzzle")}
        {renderQuadrant("plowhorse")}
        {renderQuadrant("dog")}
      </div>
      <p className="text-[10px] text-muted-foreground text-center italic">
        {language === "el"
          ? "* Βασισμένο σε ποσοστό κέρδους & συνεισφορά (€) ανά μονάδα. Προσθέστε δεδομένα πωλήσεων για πιο ακριβή ανάλυση."
          : "* Based on margin % & contribution (€) per unit. Add sales data for more accurate analysis."}
      </p>
    </div>
  );
}
