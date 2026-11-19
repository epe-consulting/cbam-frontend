/**
 * Text shown next to an iron & steel CN code in the wizard, and the CN dropdown options.
 *
 * Heading descriptions come from the backend (`GET /is/cn-mapping`, table cn_codes / cn_code_translation),
 * i.e. the CBAM-R Annex I headings (consolidated Reg. 2023/956, p.46–48). Codes below a heading come
 * from the rows printed in Implementing Regulation (EU) 2025/2621 Annex I (`subCodes`, English as
 * printed). The Combined Nomenclature itself is not in docs/cbam-sources (steel spec OQ-1), so an
 * 8-digit code without its own Annex I row shows the text of the closest row above it.
 */
import type { IsCnMappingRow } from '../api/ironSteel';
import { cnDigits } from './steelSteps';

const rowDigits = (row: { cnDigits?: string; cnCode: string }) => row.cnDigits || cnDigits(row.cnCode);

/** Mapping row whose cnDigits is the longest prefix of the entered code (e.g. 7208 51 20 → "7208"). */
export function findCnHeading(mapping: IsCnMappingRow[], cn: string | null | undefined): IsCnMappingRow | null {
  const d = cnDigits(cn ?? '');
  if (d.length < 4) return null;
  let best: IsCnMappingRow | null = null;
  for (const row of mapping) {
    const p = rowDigits(row);
    if (p && d.startsWith(p) && (best == null || p.length > rowDigits(best).length)) {
      best = row;
    }
  }
  return best;
}

/** Most specific known label for a code: the longest matching sub-code row, else the heading. */
export function findCnLabel(
  mapping: IsCnMappingRow[],
  cn: string | null | undefined,
): { cnCode: string; description: string } | null {
  const heading = findCnHeading(mapping, cn);
  if (!heading) return null;
  const d = cnDigits(cn ?? '');
  let best: { cnCode: string; description: string; len: number } = {
    cnCode: heading.cnCode, description: heading.description, len: rowDigits(heading).length,
  };
  for (const s of heading.subCodes ?? []) {
    const p = rowDigits(s);
    if (d.startsWith(p) && p.length > best.len) best = { cnCode: s.cnCode, description: s.description, len: p.length };
  }
  return { cnCode: best.cnCode, description: best.description };
}

/** "7318 15 – Threaded screws …" for the most specific known row of the code, or '' when unknown. */
export function cnHeadingText(mapping: IsCnMappingRow[], cn: string | null | undefined): string {
  const label = findCnLabel(mapping, cn);
  if (!label) return '';
  return label.description ? `${label.cnCode} – ${label.description}` : label.cnCode;
}

/** Helper text under a valid CN field: "code – description · category". */
export function cnHelperText(
  mapping: IsCnMappingRow[],
  cn: string | null | undefined,
  categoryText: string,
): string {
  const heading = cnHeadingText(mapping, cn);
  if (!heading) return categoryText;
  return categoryText ? `${heading} · ${categoryText}` : heading;
}

/** One entry of the CN dropdown: a heading or a code below it. */
export interface CnOption {
  cnCode: string;
  cnDigits: string;
  description: string;
  category: string;
  /** True for a code below a heading (shown indented). */
  sub: boolean;
  /** False when this code alone does not pick one default value (a code below it is needed). */
  dvSpecific: boolean;
}

/** Headings followed by their sub-codes, in mapping order. Precursor-only rows (hydrogen) are left out. */
export function cnOptions(mapping: IsCnMappingRow[]): CnOption[] {
  const out: CnOption[] = [];
  for (const m of mapping) {
    if (m.precursorOnly) continue;
    out.push({
      cnCode: m.cnCode, cnDigits: rowDigits(m), description: m.description, category: m.category,
      sub: false, dvSpecific: m.dvSpecific !== false,
    });
    for (const s of m.subCodes ?? []) {
      out.push({
        cnCode: s.cnCode, cnDigits: rowDigits(s), description: s.description, category: m.category,
        sub: true, dvSpecific: s.dvSpecific !== false,
      });
    }
  }
  return out;
}

/** Dropdown search: by code (with or without spaces, either direction of prefix) or by description. */
export function filterCnOptions(options: CnOption[], input: string): CnOption[] {
  const q = input.trim().toLowerCase();
  if (!q) return options;
  const qDigits = cnDigits(q);
  return options.filter((o) => (qDigits.length > 0 && /^\d+$/.test(qDigits)
    && (o.cnDigits.startsWith(qDigits) || qDigits.startsWith(o.cnDigits)))
    || o.description.toLowerCase().includes(q));
}
