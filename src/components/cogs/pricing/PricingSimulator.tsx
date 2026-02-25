import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sliders, Calculator, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Product } from "@/hooks/useProducts";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface SimulatorProps {
  products: Product[];
  costMap: Map<string, number>;
  platforms: DeliveryPlatform[];
}

function marginPct(price: number, cost: number) {
  return price > 0 ? ((price - cost) / price) * 100 : 0;
}

function priceForFoodCost(cost: number, targetFoodCostPct: number) {
  if (targetFoodCostPct <= 0 || targetFoodCostPct >= 100) return cost * 10;
  return cost / (targetFoodCostPct / 100);
}

function roundPrice(price: number): number {
  const base = Math.floor(price);
  const d = price - base;
  if (d <= 0.25) return base;
  if (d <= 0.65) return base + 0.5;
  return base + 0.9;
}

// ── What-if Scenario Builder ──────────────────────────────────────────────
export function WhatIfBuilder({ products, costMap, platforms }: SimulatorProps) {
  const { language } = useLanguage();
  const [costChange, setCostChange] = useState(0);   // % change in cost
  const [priceChange, setPriceChange] = useState(0);  // % change in price

  const simulation = useMemo(() => {
    const results = products
      .filter((p) => (p.selling_price_dinein > 0 || p.selling_price_delivery > 0) && costMap.has(p.id))
      .map((p) => {
        const origCost = costMap.get(p.id) || 0;
        const newCost = origCost * (1 + costChange / 100);
        const newPriceDI = p.selling_price_dinein * (1 + priceChange / 100);
        const newPriceDL = p.selling_price_delivery * (1 + priceChange / 100);

        const origMarginDI = marginPct(p.selling_price_dinein, origCost);
        const newMarginDI = marginPct(newPriceDI, newCost);
        const origMarginDL = marginPct(p.selling_price_delivery, origCost);
        const newMarginDL = marginPct(newPriceDL, newCost);

        return {
          name: p.name,
          origMarginDI,
          newMarginDI,
          origMarginDL,
          newMarginDL,
          hasDelivery: p.selling_price_delivery > 0,
          marginChange: newMarginDI - origMarginDI,
        };
      });

    const avgOrigMargin = results.length > 0 ? results.reduce((s, r) => s + r.origMarginDI, 0) / results.length : 0;
    const avgNewMargin = results.length > 0 ? results.reduce((s, r) => s + r.newMarginDI, 0) / results.length : 0;
    const negativeCount = results.filter((r) => r.newMarginDI < 0).length;

    return { results, avgOrigMargin, avgNewMargin, negativeCount };
  }, [products, costMap, costChange, priceChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Sliders className="w-3.5 h-3.5 text-primary" />
        {language === "el" ? "Σενάριο What-If" : "What-If Scenario"}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {language === "el" ? "Μεταβολή κόστους" : "Cost change"} (%)
          </label>
          <Input
            type="number"
            value={costChange}
            onChange={(e) => setCostChange(Number(e.target.value))}
            className="h-8 text-sm font-mono"
            step={1}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {language === "el" ? "Μεταβολή τιμής" : "Price change"} (%)
          </label>
          <Input
            type="number"
            value={priceChange}
            onChange={(e) => setPriceChange(Number(e.target.value))}
            className="h-8 text-sm font-mono"
            step={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">{language === "el" ? "Τρέχον μέσο" : "Current avg"}</p>
          <p className="text-sm font-bold font-mono">{simulation.avgOrigMargin.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">{language === "el" ? "Νέο μέσο" : "New avg"}</p>
          <p className={`text-sm font-bold font-mono ${simulation.avgNewMargin < simulation.avgOrigMargin ? "text-red-500" : "text-green-500"}`}>
            {simulation.avgNewMargin.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">{language === "el" ? "Αρνητικά" : "Negative"}</p>
          <p className={`text-sm font-bold font-mono ${simulation.negativeCount > 0 ? "text-red-500" : "text-green-500"}`}>
            {simulation.negativeCount}
          </p>
        </div>
      </div>

      {(costChange !== 0 || priceChange !== 0) && (
        <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
          {simulation.results
            .sort((a, b) => a.marginChange - b.marginChange)
            .slice(0, 10)
            .map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="truncate flex-1 mr-2">{r.name}</span>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-muted-foreground">{r.origMarginDI.toFixed(1)}%</span>
                  <span>→</span>
                  <span className={r.newMarginDI < r.origMarginDI ? "text-red-500" : "text-green-500"}>
                    {r.newMarginDI.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Break-even Calculator ─────────────────────────────────────────────────
export function BreakEvenCalculator({ products, costMap, platforms }: SimulatorProps) {
  const { language } = useLanguage();
  const [fixedCosts, setFixedCosts] = useState(2000);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const product = products.find((p) => p.id === selectedProductId);
  const cost = product ? costMap.get(product.id) ?? 0 : 0;

  const breakEvenData = useMemo(() => {
    if (!product || cost <= 0) return null;

    const dineinContribution = product.selling_price_dinein - cost;
    const dineinUnits = dineinContribution > 0 ? Math.ceil(fixedCosts / dineinContribution) : null;

    const platformResults = platforms.map((pl) => {
      const commission = pl.commission_percent / 100;
      const effectiveRevenue = product.selling_price_delivery * (1 - commission);
      const contribution = effectiveRevenue - cost;
      const units = contribution > 0 ? Math.ceil(fixedCosts / contribution) : null;

      return { name: pl.name, commission: pl.commission_percent, contribution, units };
    });

    return { dineinContribution, dineinUnits, platformResults };
  }, [product, cost, fixedCosts, platforms]);

  const validProducts = products.filter((p) => p.selling_price_dinein > 0 && costMap.has(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Calculator className="w-3.5 h-3.5 text-primary" />
        {language === "el" ? "Υπολογιστής Break-Even" : "Break-Even Calculator"}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {language === "el" ? "Μηνιαία πάγια (€)" : "Monthly fixed costs (€)"}
        </label>
        <Input
          type="number"
          value={fixedCosts}
          onChange={(e) => setFixedCosts(Number(e.target.value))}
          className="h-8 text-sm font-mono"
          step={100}
          min={0}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {language === "el" ? "Επιλέξτε προϊόν" : "Select product"}
        </label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full h-8 text-sm rounded-md border border-input bg-background px-3 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{language === "el" ? "— Επιλέξτε —" : "— Select —"}</option>
          {validProducts.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {breakEvenData && (
        <div className="space-y-2">
          {breakEvenData.dineinUnits !== null && (
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">{language === "el" ? "Dine-in" : "Dine-in"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {language === "el" ? "Συνεισφορά" : "Contribution"}: €{breakEvenData.dineinContribution.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono">{breakEvenData.dineinUnits}</p>
                <p className="text-[10px] text-muted-foreground">{language === "el" ? "μονάδες/μήνα" : "units/month"}</p>
              </div>
            </div>
          )}

          {breakEvenData.platformResults.map((pl, i) => (
            <div key={i} className="rounded-lg border p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">{pl.name} ({pl.commission}%)</p>
                <p className="text-[10px] text-muted-foreground">
                  {language === "el" ? "Συνεισφορά" : "Contribution"}: €{pl.contribution.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                {pl.units !== null ? (
                  <>
                    <p className="text-lg font-bold font-mono">{pl.units}</p>
                    <p className="text-[10px] text-muted-foreground">{language === "el" ? "μονάδες/μήνα" : "units/month"}</p>
                  </>
                ) : (
                  <p className="text-xs text-red-500 font-medium">{language === "el" ? "Μη κερδοφόρο" : "Unprofitable"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Food Cost Target Mode ─────────────────────────────────────────────────
export function FoodCostTarget({ products, costMap }: Omit<SimulatorProps, "platforms">) {
  const { language } = useLanguage();
  const [targetFoodCost, setTargetFoodCost] = useState(30);

  const results = useMemo(() => {
    return products
      .filter((p) => p.selling_price_dinein > 0 && costMap.has(p.id) && (costMap.get(p.id) ?? 0) > 0)
      .map((p) => {
        const cost = costMap.get(p.id) || 0;
        const currentFoodCost = (cost / p.selling_price_dinein) * 100;
        const neededPrice = roundPrice(priceForFoodCost(cost, targetFoodCost));
        const priceGap = neededPrice - p.selling_price_dinein;
        const onTarget = currentFoodCost <= targetFoodCost;

        return { name: p.name, category: p.category, cost, currentFoodCost, neededPrice, priceGap, onTarget, currentPrice: p.selling_price_dinein };
      })
      .sort((a, b) => b.currentFoodCost - a.currentFoodCost);
  }, [products, costMap, targetFoodCost]);

  const offTargetCount = results.filter((r) => !r.onTarget).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Target className="w-3.5 h-3.5 text-primary" />
        {language === "el" ? "Στόχος Food Cost %" : "Food Cost % Target"}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {language === "el" ? "Στόχος Food Cost %" : "Target Food Cost %"}
          </label>
          <Input
            type="number"
            value={targetFoodCost}
            onChange={(e) => setTargetFoodCost(Math.max(1, Math.min(99, Number(e.target.value))))}
            className="h-8 text-sm font-mono"
            step={1}
            min={1}
            max={99}
          />
        </div>
        <div className="text-right pt-4">
          <p className={`text-sm font-semibold ${offTargetCount > 0 ? "text-amber-600" : "text-green-600"}`}>
            {offTargetCount}/{results.length}
          </p>
          <p className="text-[10px] text-muted-foreground">{language === "el" ? "εκτός στόχου" : "off target"}</p>
        </div>
      </div>

      <div className="rounded-lg border divide-y max-h-52 overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2 text-xs ${r.onTarget ? "" : "bg-amber-50/50 dark:bg-amber-900/10"}`}>
            <div className="min-w-0 flex-1 mr-2">
              <p className="truncate font-medium">{r.name}</p>
              <p className="text-[10px] text-muted-foreground">
                FC: {r.currentFoodCost.toFixed(1)}% · €{r.currentPrice.toFixed(2)}
              </p>
            </div>
            {!r.onTarget && (
              <div className="text-right shrink-0">
                <p className="font-mono text-amber-600">→ €{r.neededPrice.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">+€{r.priceGap.toFixed(2)}</p>
              </div>
            )}
            {r.onTarget && (
              <span className="text-green-500 text-[10px] font-medium">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
