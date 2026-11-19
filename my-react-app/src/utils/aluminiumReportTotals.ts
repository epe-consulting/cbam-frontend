/**
 * Pure helpers for the (aluminium-only) report path in GenerateReport.tsx.
 *
 * Extracted unchanged in intent from GenerateReport.tsx (splitEmissions, specific-direct auto-fill), with one
 * safety change: only items that are emissions in t CO2e are summed. Steel (IS_*) items and items in other units
 * (t CO2e/t, t, %) are never added into direct/indirect totals.
 *
 * Units follow the backend contract: CalculationResultItemResponse.unit ("t CO2e" | "t CO2e/t" | "t" | "%").
 */
import { UNIT_T_CO2E, formatSeeNumber, formatTonnesNumber, kgToTonnes } from './formatEmissions';

export interface ReportResultItem {
  formulaCode: string;
  outputCode: string | null;
  resultValue: number;
  /** Optional: older backends do not send it. */
  unit?: string | null;
}

/** Aluminium formula codes whose result is electricity-related (indirect) emissions. */
export const INDIRECT_FORMULA_CODES = new Set([
  'ALU_GRID_ELECTRICITY_EMISSIONS',
  'ALU_OWN_PLANT_ELECTRICITY_EMISSIONS',
  'ALU_PPA_ELECTRICITY_EMISSIONS',
  'ALU_PPA_ELECTRICITY_EMISSIONS_NO_EF',
]);

export const DIRECT_INDIRECT_SUM_CODE = 'ALU_DIRECT_INDIRECT_SUM';

/**
 * True when the item is an aluminium emission value in t CO2e and may be summed.
 * - With `unit`: must be exactly "t CO2e" and not a steel (IS_) formula.
 * - Without `unit` (older backend): only ALU_ formula codes are accepted.
 */
export function isAluminiumEmissionItem(item: ReportResultItem): boolean {
  const code = item.formulaCode ?? '';
  if (code.startsWith('IS_')) return false;
  if (item.unit != null && item.unit !== '') return item.unit === UNIT_T_CO2E && code.startsWith('ALU_');
  return code.startsWith('ALU_');
}

/** Sum aluminium emission items into direct / indirect (t CO2e). Non-emission and steel items are skipped. */
export function splitEmissions(items: ReportResultItem[]): { direct: number; indirect: number } {
  let direct = 0;
  let indirect = 0;
  for (const item of items) {
    if (!isAluminiumEmissionItem(item)) continue;
    const v = Number(item.resultValue) || 0;
    if (INDIRECT_FORMULA_CODES.has(item.formulaCode) || (item.outputCode ?? '').includes('ELECTRICITY')) {
      indirect += v;
    } else {
      direct += v;
    }
  }
  return { direct, indirect };
}

/**
 * Tool totals for the aluminium report when no explicit direct/indirect answer exists:
 * sum every aluminium t CO2e item, including ALU_DIRECT_INDIRECT_SUM (the user-entered emissions of the
 * unwrought stage). Since post-043 that path continues through the collection point, so the products
 * stage (precursors, remaining fuels, flue gas) or the secondary module add their own, separate items.
 * Same rule as the backend total (CalculationResultService: sum of all t CO2e items).
 * Returns null when there is no aluminium emission item at all (e.g. a steel calculation).
 */
export function aluminiumToolTotals(items: ReportResultItem[]): { direct: number; indirect: number } | null {
  const emissionItems = items.filter(isAluminiumEmissionItem);
  if (emissionItems.length === 0) return null;
  return splitEmissions(emissionItems);
}

/** True when the result holds aluminium emission items other than the user-entered total. */
export function hasItemsBesidesEnteredTotal(items: ReportResultItem[]): boolean {
  return items.some((i) => isAluminiumEmissionItem(i) && i.formulaCode !== DIRECT_INDIRECT_SUM_CODE);
}

/** Specific direct embedded emissions [t CO2e/t] = direct total [t CO2e] ÷ product quantity [t]. */
export function specificDirect(directTotalT: number | null | undefined, productQtyT: number | null | undefined): number | null {
  if (directTotalT == null || productQtyT == null) return null;
  if (!Number.isFinite(directTotalT) || !Number.isFinite(productQtyT) || productQtyT <= 0) return null;
  return directTotalT / productQtyT;
}

/** Same as specificDirect, formatted with max. 5 decimals (IR 2025/2547 Annex II A.1 pt 8, p.28). */
export function specificDirectText(directTotalT: number | null | undefined, productQtyT: number | null | undefined): string {
  const v = specificDirect(directTotalT, productQtyT);
  return v == null ? '' : formatSeeNumber(v);
}

/**
 * Precursor quantity as entered (kg — PrecursorInputStep / ExternalUnwroughtInputStep label "Količina (kg)")
 * converted to t for the report. Empty / non-numeric input is passed through unchanged.
 */
export function precursorKgToTonnesText(kolicinaKg: string | null | undefined): string {
  const t = kgToTonnes(kolicinaKg);
  return t == null ? (kolicinaKg ?? '') : formatTonnesNumber(t);
}
