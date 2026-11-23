// Precursors whose embedded emissions count as zero because of their origin.
//
// IR (EU) 2025/2547 Annex III, point B (p. 72): "If a precursor i originates in the Union or in one of
// the countries or territories exempted pursuant to point 1 of Annex III to Regulation (EU) 2023/956
// the specific direct or indirect embedded emissions of that precursor shall be counted as zero."
// Annex III point 1 to Reg. (EU) 2023/956 (consolidated 20.10.2025): Iceland, Liechtenstein, Norway,
// Switzerland; territories Büsingen, Heligoland, Livigno, Ceuta, Melilla.
// Same rule in the backend: CalculationResultService.isZeroEmbeddedOrigin.

export const ANNEX_III_POINT_1_ORIGINS = [
  'Iceland', 'Liechtenstein', 'Norway', 'Switzerland',
  'Büsingen', 'Heligoland', 'Livigno', 'Ceuta', 'Melilla',
] as const;

const NAMES = new Set([...ANNEX_III_POINT_1_ORIGINS.map((n) => n.toLowerCase()), 'busingen']);

/** True for an EU-member origin or a country / territory of Annex III point 1 to Reg. 2023/956. */
export function isZeroEmbeddedOrigin(clanicaEu: string | null | undefined, country: string | null | undefined): boolean {
  if ((clanicaEu ?? '').toUpperCase() === 'EU_MEMBER') return true;
  return NAMES.has((country ?? '').trim().toLowerCase());
}
