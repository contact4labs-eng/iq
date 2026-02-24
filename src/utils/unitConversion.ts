/**
 * Unit conversion utility for COGS ingredient calculations.
 * Supports: kg ↔ g, lt ↔ ml
 */

type WeightUnit = "kg" | "g";
type VolumeUnit = "lt" | "ml";
export type MetricUnit = WeightUnit | VolumeUnit;

const WEIGHT_UNITS: WeightUnit[] = ["kg", "g"];
const VOLUME_UNITS: VolumeUnit[] = ["lt", "ml"];

/** Base unit factors (convert TO base: kg or lt) */
const TO_BASE: Record<MetricUnit, number> = {
  kg: 1,
  g: 0.001,    // 1g = 0.001 kg
  lt: 1,
  ml: 0.001,   // 1ml = 0.001 lt
};

/** Check if a string is a valid metric unit */
export function isMetricUnit(u: string): u is MetricUnit {
  return ["kg", "g", "lt", "ml"].includes(u);
}

/** Check if two units can be converted between each other */
export function areUnitsCompatible(from: string, to: string): boolean {
  if (!isMetricUnit(from) || !isMetricUnit(to)) return false;
  const fromIsWeight = (WEIGHT_UNITS as string[]).includes(from);
  const toIsWeight = (WEIGHT_UNITS as string[]).includes(to);
  const fromIsVolume = (VOLUME_UNITS as string[]).includes(from);
  const toIsVolume = (VOLUME_UNITS as string[]).includes(to);
  return (fromIsWeight && toIsWeight) || (fromIsVolume && toIsVolume);
}

/**
 * Convert a value from one unit to another.
 * Throws if units are incompatible.
 */
export function convertUnits(value: number, from: string, to: string): number {
  if (from === to) return value;
  if (!isMetricUnit(from) || !isMetricUnit(to)) {
    throw new Error(`Invalid units: ${from} → ${to}`);
  }
  if (!areUnitsCompatible(from, to)) {
    throw new Error(`Incompatible units: ${from} → ${to}`);
  }
  // Convert to base, then to target
  const baseValue = value * TO_BASE[from];
  return baseValue / TO_BASE[to];
}

/**
 * Calculate ingredient cost: price is per `priceUnit`, recipe uses `quantity` in `recipeUnit`.
 * Returns the cost for that quantity.
 */
export function ingredientCost(
  pricePerUnit: number,
  priceUnit: string,
  quantity: number,
  recipeUnit: string
): number {
  const convertedQty = convertUnits(quantity, recipeUnit, priceUnit);
  return convertedQty * pricePerUnit;
}
