// Regulatory constants for the cost calculator. Every value carries its source.
// Only documents in docs/cbam-sources are used. Gaps are listed in OPEN_QUESTIONS.md.

import type { Sector } from './types.ts';
import { tr } from '../i18n';

/** Reg. (EU) 2023/956 Art. 2a(1) + Annex VII point 1 (consolidated 20.10.2025, pp. 6, 56): 50 t net mass. */
export const MASS_THRESHOLD_TONNES = 50;

/**
 * CBAM factor (share of free allocation still granted) by year.
 * Source: Guidance Document No. 4 (Free allocation adjustment), Table 2-1, p. 13.
 * NOTE: the binding values are in Directive 2003/87/EC Art. 10a(1a), which is NOT in
 * docs/cbam-sources. Used with the user's agreement as "guidance, pending legal act".
 */
export const CBAM_FACTOR: Record<number, number> = {
  2026: 0.975,
  2027: 0.95,
  2028: 0.9,
  2029: 0.775,
  2030: 0.515,
  2031: 0.39,
  2032: 0.265,
  2033: 0.14,
  2034: 0.0,
};
export const CBAM_FACTOR_SOURCE =
  'Guidance Doc. No. 4, Table 2-1, p. 13 (binding source Directive 2003/87/EC Art. 10a(1a) not supplied)';

/**
 * Cross-sectoral correction factor. Source: Guidance Document No. 4, Table 2-1, p. 13 ("preliminary", 1,0).
 * Footnote 10 there refers to Implementing Decision (EU) 2026/1862, which is NOT in docs/cbam-sources.
 */
export const CSCF: Record<number, number> = {
  2026: 1.0,
  2027: 1.0,
  2028: 1.0,
  2029: 1.0,
  2030: 1.0,
  2031: 1.0,
  2032: 1.0,
  2033: 1.0,
  2034: 1.0,
};
export const CSCF_SOURCE =
  'Guidance Doc. No. 4, Table 2-1, p. 13 (preliminary; Implementing Decision (EU) 2026/1862 not supplied)';

/**
 * Benchmark year bands. IR 2025/2620 Annex point 5.3: "(1) Value is to be used for production
 * years 2026-27; (2) Value is to be used for production years 2028-30".
 */
export function benchmarkYearBand(year: number): 1 | 2 | null {
  if (year >= 2026 && year <= 2027) return 1;
  if (year >= 2028 && year <= 2030) return 2;
  return null;
}

/** Default-value column by reporting year. IR 2025/2621 Annex I column headers (p. 4 onwards). */
export function defaultValueColumn(year: number): 'y2026' | 'y2027' | 'y2028' | null {
  if (year === 2026) return 'y2026';
  if (year === 2027) return 'y2027';
  if (year >= 2028) return 'y2028';
  return null; // before the definitive period
}

export const FALLBACK_COUNTRY = 'Other countries and territories';

/**
 * Scope. Reg. (EU) 2023/956 Annex I, point 2 table (consolidated 20.10.2025, pp. 46-49).
 * Prefixes are CN digits without spaces.
 */
const SCOPE: { prefix: string; sector: Sector; note?: string }[] = [
  { prefix: '25070080', sector: 'CEMENT', note: 'ex 2507 00 80: only other kaolinic clays, except non-calcined' },
  { prefix: '25231000', sector: 'CEMENT' },
  { prefix: '25232100', sector: 'CEMENT' },
  { prefix: '25232900', sector: 'CEMENT' },
  { prefix: '25233000', sector: 'CEMENT' },
  { prefix: '25239000', sector: 'CEMENT' },
  { prefix: '27160000', sector: 'ELECTRICITY' },
  { prefix: '28080000', sector: 'FERTILISERS' },
  { prefix: '2814', sector: 'FERTILISERS' },
  { prefix: '28342100', sector: 'FERTILISERS' },
  { prefix: '3102', sector: 'FERTILISERS' },
  { prefix: '3105', sector: 'FERTILISERS' },
  { prefix: '72', sector: 'IRON_AND_STEEL' },
  { prefix: '26011200', sector: 'IRON_AND_STEEL' },
  { prefix: '7301', sector: 'IRON_AND_STEEL' },
  { prefix: '7302', sector: 'IRON_AND_STEEL' },
  { prefix: '730300', sector: 'IRON_AND_STEEL' },
  { prefix: '7304', sector: 'IRON_AND_STEEL' },
  { prefix: '7305', sector: 'IRON_AND_STEEL' },
  { prefix: '7306', sector: 'IRON_AND_STEEL' },
  { prefix: '7307', sector: 'IRON_AND_STEEL' },
  { prefix: '7308', sector: 'IRON_AND_STEEL' },
  { prefix: '730900', sector: 'IRON_AND_STEEL' },
  { prefix: '7310', sector: 'IRON_AND_STEEL' },
  { prefix: '731100', sector: 'IRON_AND_STEEL' },
  { prefix: '7318', sector: 'IRON_AND_STEEL' },
  { prefix: '7326', sector: 'IRON_AND_STEEL' },
  { prefix: '7601', sector: 'ALUMINIUM' },
  { prefix: '7603', sector: 'ALUMINIUM' },
  { prefix: '7604', sector: 'ALUMINIUM' },
  { prefix: '7605', sector: 'ALUMINIUM' },
  { prefix: '7606', sector: 'ALUMINIUM' },
  { prefix: '7607', sector: 'ALUMINIUM' },
  { prefix: '7608', sector: 'ALUMINIUM' },
  { prefix: '76090000', sector: 'ALUMINIUM' },
  { prefix: '7610', sector: 'ALUMINIUM' },
  { prefix: '76110000', sector: 'ALUMINIUM' },
  { prefix: '7612', sector: 'ALUMINIUM' },
  { prefix: '76130000', sector: 'ALUMINIUM' },
  { prefix: '7614', sector: 'ALUMINIUM' },
  { prefix: '7616', sector: 'ALUMINIUM' },
  { prefix: '28041000', sector: 'HYDROGEN' },
];

/** Exclusions in the same Annex I table. */
const SCOPE_EXCLUSIONS: { prefix: string; label: string }[] = [
  { prefix: '31056000', label: '3105 60 00 (fertilisers containing phosphorus and potassium)' },
  { prefix: '72022', label: '7202 2 (ferro-silicon)' },
  { prefix: '72023000', label: '7202 30 00 (ferro-silico-manganese)' },
  { prefix: '72025000', label: '7202 50 00 (ferro-silico-chromium)' },
  { prefix: '72027000', label: '7202 70 00 (ferro-molybdenum)' },
  { prefix: '72028000', label: '7202 80 00 (ferro-tungsten)' },
  { prefix: '72029100', label: '7202 91 00 (ferro-titanium)' },
  { prefix: '72029200', label: '7202 92 00 (ferro-vanadium)' },
  { prefix: '72029300', label: '7202 93 00 (ferro-niobium)' },
  { prefix: '720299', label: '7202 99 (other ferro-alloys)' },
  { prefix: '7204', label: '7204 (ferrous waste and scrap)' },
];

export const SCOPE_SOURCE = 'Reg. (EU) 2023/956 Annex I (consolidated 20.10.2025, pp. 46-49)';

export function scopeOf(cnDigits: string): { inScope: boolean; sector?: Sector; note: string } {
  const excl = SCOPE_EXCLUSIONS.find((e) => cnDigits.startsWith(e.prefix));
  if (excl) return { inScope: false, note: tr('cc.r.excluded', { label: excl.label, src: SCOPE_SOURCE }) };
  const hit = SCOPE.find((s) => cnDigits.startsWith(s.prefix));
  if (!hit) return { inScope: false, note: tr('cc.r.notListed', { src: SCOPE_SOURCE }) };
  return { inScope: true, sector: hit.sector, note: `${hit.note ? hit.note + '. ' : ''}${SCOPE_SOURCE}` };
}

/** Art. 2a(4): the threshold does not apply to electricity or hydrogen. */
export function thresholdApplies(sector: Sector): boolean {
  return sector !== 'ELECTRICITY' && sector !== 'HYDROGEN';
}

export const SOURCES = {
  freeAllocationDefault: 'IR (EU) 2025/2620 Annex point 4, Equation 6; point 5.1 (route selection)',
  freeAllocationTotal: 'IR (EU) 2025/2620 Annex point 2, Equation 1 (FAA = SEFA × M)',
  sefaActual: 'Supplier operator emissions report (Guidance Doc. No. 4 §2.2: report contains SEFA)',
  defaultValues: 'IR (EU) 2025/2621 Annex I',
  fallback: 'IR (EU) 2025/2621 Annex I introductory text, p. 4 ("Other countries and territories")',
  reportingYearDefault: 'IR (EU) 2025/2547 Art. 7(1); Guidance Doc. No. 3 p. 116',
  certificates: 'Reg. (EU) 2023/956 Art. 6(2)(c), Art. 9, Art. 31',
  price2026: 'Reg. (EU) 2023/956 Art. 21(1a): 2026 = quarterly average of the quarter of importation',
  priceFrom2027: 'Reg. (EU) 2023/956 Art. 21(1)-(2): weekly average price applying when certificates are bought',
  deductionDefault:
    'Reg. (EU) 2023/956 Art. 9(4): with default values, only by reference to Commission yearly default carbon prices',
  deductionConversion: 'IR (EU) 2026/2498 (conversion rules) is not in docs/cbam-sources',
  threshold: 'Reg. (EU) 2023/956 Art. 2a(1)-(2), (4); Annex VII point 1',
};
