/**
 * Text shown next to an iron & steel CN code in the wizard.
 *
 * Descriptions come from the backend (`GET /is/cn-mapping`, table cn_codes / cn_code_translation),
 * i.e. the CBAM-R Annex I headings (consolidated Reg. 2023/956, p.46–48). They exist per heading
 * (4 digits, or 5 for 7202 1 / 7202 4 / 7202 6), not per 8-digit subheading: the Combined Nomenclature
 * is not in docs/cbam-sources (steel spec OQ-1), so all 8-digit codes of one heading share its text.
 */
import type { IsCnMappingRow } from '../api/ironSteel';
import { cnDigits } from './steelSteps';

/** Mapping row whose cnDigits is the longest prefix of the entered code (e.g. 7208 51 20 → "7208"). */
export function findCnHeading(mapping: IsCnMappingRow[], cn: string | null | undefined): IsCnMappingRow | null {
  const d = cnDigits(cn ?? '');
  if (d.length < 4) return null;
  let best: IsCnMappingRow | null = null;
  for (const row of mapping) {
    const p = row.cnDigits || cnDigits(row.cnCode);
    if (p && d.startsWith(p) && (best == null || p.length > (best.cnDigits || cnDigits(best.cnCode)).length)) {
      best = row;
    }
  }
  return best;
}

/** "7208 – Flat-rolled products …" for the heading the code belongs to, or '' when unknown. */
export function cnHeadingText(mapping: IsCnMappingRow[], cn: string | null | undefined): string {
  const row = findCnHeading(mapping, cn);
  if (!row) return '';
  return row.description ? `${row.cnCode} – ${row.description}` : row.cnCode;
}

/** Helper text under a valid CN field: "heading – description · category". */
export function cnHelperText(
  mapping: IsCnMappingRow[],
  cn: string | null | undefined,
  categoryText: string,
): string {
  const heading = cnHeadingText(mapping, cn);
  if (!heading) return categoryText;
  return categoryText ? `${heading} · ${categoryText}` : heading;
}
