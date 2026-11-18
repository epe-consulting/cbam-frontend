/**
 * Pure display formatting for calculation results (emissions, SEE, mass, shares).
 *
 * Regulatory rounding rules (display only — never feed formatted values back into calculations):
 * - Implementing Regulation (EU) 2025/2547 (OJ-L-202502547.pdf), Annex II, Section A.1, point 6 (OJ p.28/86):
 *   "Emissions data over a full reporting period shall be expressed in tonnes CO2e rounded to full tonnes."
 *   -> formatEmissions(value, unit, 'report').
 * - Same Annex II, Section A.1, point 8 (OJ p.28/86): specific direct and indirect embedded emissions
 *   "expressed in tonnes of CO2e per tonne of goods ... with a maximum of 5 digits after the comma."
 *   -> formatSee(value).
 * - docs/steel-implementation-spec.md §0.2: "show 1 decimal in the detail view is allowed" for period emissions
 *   -> formatEmissions(value, unit, 'detail') (default).
 * - Same Annex II, Section A.1, point 7 (OJ p.28/86): parameters used to calculate emissions keep all significant
 *   digits -> formatResultItem() shows intermediate per-formula results unrounded to whole tonnes
 *   (ITEM_MAX_DECIMALS is a UI display choice, not a regulatory number).
 */

/** Unit strings of the backend contract (CalculationResultResponse / CalculationResultItemResponse). */
export const UNIT_T_CO2E = 't CO2e';
export const UNIT_SEE = 't CO2e/t';
export const UNIT_TONNES = 't';
export const UNIT_PERCENT = '%';

/** Fallback for emission totals when an older backend sends no `totalEmissionsUnit`. */
export const DEFAULT_TOTAL_UNIT = UNIT_T_CO2E;

/** IR 2025/2547 Annex II A.1 pt 8 (p.28): max. 5 digits after the comma for SEE. */
export const SEE_MAX_DECIMALS = 5;
/** IR 2025/2547 Annex II A.1 pt 6 (p.28): full tonnes for period emissions (reporting). */
export const REPORT_EMISSION_DECIMALS = 0;
/** docs/steel-implementation-spec.md §0.2: 1 decimal allowed in detail views. */
export const DETAIL_EMISSION_DECIMALS = 1;
/** UI choice (not regulatory) for intermediate per-formula values; see header (A.1 pt 7). */
export const ITEM_MAX_DECIMALS = 4;
/** UI choice (not regulatory) for masses converted from kg: 6 decimals keeps gram resolution. */
export const TONNES_MAX_DECIMALS = 6;
/** UI choice (not regulatory) for shares in %. */
export const PERCENT_MAX_DECIMALS = 2;

export type EmissionPrecision = 'report' | 'detail';

const DASH = '—';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return isFiniteNumber(n) ? n : null;
}

/**
 * Plain number with dot decimal, no thousands grouping (matches existing UI and report inputs).
 * `minDecimals` pads (fixed display), otherwise trailing zeros are trimmed.
 */
export function formatNumber(value: number, maxDecimals: number, minDecimals = 0): string {
  const s = value.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: minDecimals,
    useGrouping: false,
  });
  // Avoid "-0" / "-0.0" after rounding.
  return /^-0(\.0*)?$/.test(s) ? s.slice(1) : s;
}

/** Display label for a contract unit (subscript 2). Unknown units are shown as received. */
export function unitLabel(unit: string | null | undefined): string {
  if (!unit) return '';
  return unit.replace(/CO2e/g, 'CO₂e');
}

/**
 * Period emission value (t CO2e) with unit.
 * 'report': whole tonnes (IR 2025/2547 Annex II A.1 pt 6, p.28); 'detail': 1 decimal (steel spec §0.2).
 * Missing unit falls back to DEFAULT_TOTAL_UNIT.
 */
export function formatEmissions(
  value: number | string | null | undefined,
  unit: string | null | undefined = DEFAULT_TOTAL_UNIT,
  precision: EmissionPrecision = 'detail',
): string {
  const n = toNumber(value);
  if (n == null) return DASH;
  const decimals = precision === 'report' ? REPORT_EMISSION_DECIMALS : DETAIL_EMISSION_DECIMALS;
  return `${formatNumber(n, decimals, decimals)} ${unitLabel(unit || DEFAULT_TOTAL_UNIT)}`;
}

/** Number only (no unit) for an emission value — for table cells whose header carries the unit. */
export function formatEmissionsNumber(
  value: number | string | null | undefined,
  precision: EmissionPrecision = 'detail',
): string {
  const n = toNumber(value);
  if (n == null) return DASH;
  const decimals = precision === 'report' ? REPORT_EMISSION_DECIMALS : DETAIL_EMISSION_DECIMALS;
  return formatNumber(n, decimals, decimals);
}

/** SEE number in t CO2e/t, max. 5 decimals (IR 2025/2547 Annex II A.1 pt 8, p.28). No unit appended. */
export function formatSeeNumber(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n == null) return DASH;
  return formatNumber(n, SEE_MAX_DECIMALS);
}

/** SEE with unit "t CO₂e/t", max. 5 decimals (IR 2025/2547 Annex II A.1 pt 8, p.28). */
export function formatSee(value: number | string | null | undefined): string {
  const s = formatSeeNumber(value);
  return s === DASH ? s : `${s} ${unitLabel(UNIT_SEE)}`;
}

/**
 * One result item (per-formula value) using its own `unit` from the API.
 * - "t CO2e/t" -> SEE rule (max 5 decimals)
 * - "t CO2e" / "t" -> up to ITEM_MAX_DECIMALS (intermediate parameter, A.1 pt 7)
 * - "%" -> up to PERCENT_MAX_DECIMALS
 * - missing unit (older backend) -> number only, no unit label, so a value of unknown unit is never labelled tonnes.
 */
export function formatResultItem(value: number | string | null | undefined, unit: string | null | undefined): string {
  const n = toNumber(value);
  if (n == null) return DASH;
  switch (unit) {
    case UNIT_SEE:
      return `${formatNumber(n, SEE_MAX_DECIMALS)} ${unitLabel(UNIT_SEE)}`;
    case UNIT_PERCENT:
      return `${formatNumber(n, PERCENT_MAX_DECIMALS)} %`;
    case UNIT_T_CO2E:
    case UNIT_TONNES:
      return `${formatNumber(n, ITEM_MAX_DECIMALS)} ${unitLabel(unit)}`;
    default:
      if (!unit) return formatNumber(n, ITEM_MAX_DECIMALS);
      return `${formatNumber(n, ITEM_MAX_DECIMALS)} ${unitLabel(unit)}`;
  }
}

/** Mass conversion kg -> t (1 t = 1000 kg). Returns null for empty / non-numeric input. */
export function kgToTonnes(kg: number | string | null | undefined): number | null {
  const n = toNumber(kg);
  return n == null ? null : n / 1000;
}

/** Mass in tonnes, number only (up to TONNES_MAX_DECIMALS, trailing zeros trimmed). */
export function formatTonnesNumber(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n == null) return DASH;
  return formatNumber(n, TONNES_MAX_DECIMALS);
}

/** Mass in tonnes with unit "t". */
export function formatTonnes(value: number | string | null | undefined): string {
  const s = formatTonnesNumber(value);
  return s === DASH ? s : `${s} ${UNIT_TONNES}`;
}
