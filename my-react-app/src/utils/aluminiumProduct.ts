/**
 * Checks for the aluminium CBAM_PRODUCT_DETAILS rows (product name, CN code, quantity, country).
 *
 * The CN list is the aluminium positive list from the backend (`GET /cn-codes/active`, table cn_codes,
 * sector ALUMINIUM): CBAM-R Annex I "Aluminium" (consolidated Reg. 2023/956, p.47) – 7601, 7603–7614,
 * 7616 (+ 7609 00 00, 7611 00 00, 7613 00 00 as printed). A longer code (e.g. 7606 12 20) is accepted when
 * it starts with a listed code. The app has no copy of the Combined Nomenclature, so it cannot check that
 * an 8-digit code exists, only that it falls under a listed one (same as steel, spec OQ-1).
 */
import type { CnCodeDto } from '../hooks/useCnCodes';

export const cnDigitsOf = (cn: string | null | undefined): string => (cn ?? '').replace(/[\s.]/g, '');

/** Listed aluminium code the entered code falls under (longest match), or null. */
export function findAluminiumCn(list: CnCodeDto[], cn: string | null | undefined): CnCodeDto | null {
  const d = cnDigitsOf(cn);
  if (!/^\d{4,8}$/.test(d)) return null;
  let best: CnCodeDto | null = null;
  for (const c of list) {
    const p = cnDigitsOf(c.cnCode);
    if (p && d.startsWith(p) && (best == null || p.length > cnDigitsOf(best.cnCode).length)) best = c;
  }
  return best;
}

export type AluCnCheck = 'ok' | 'empty' | 'format' | 'notAluminium';

/** 4–8 digits and inside the aluminium list. */
export function checkAluminiumCn(list: CnCodeDto[], cn: string | null | undefined): AluCnCheck {
  const d = cnDigitsOf(cn);
  if (d === '') return 'empty';
  if (!/^\d{4,8}$/.test(d)) return 'format';
  return findAluminiumCn(list, cn) ? 'ok' : 'notAluminium';
}

/** Quantity as a number (dot or comma decimal); null when not a number. */
export function parseQuantity(value: string | null | undefined): number | null {
  const s = (value ?? '').trim().replace(',', '.');
  if (s === '' || !/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Dropdown search over the aluminium list: by code (with or without spaces) or by description. */
export function filterAluminiumCn(list: CnCodeDto[], input: string): CnCodeDto[] {
  const q = input.trim().toLowerCase();
  if (!q) return list;
  const qd = cnDigitsOf(q);
  return list.filter((c) => {
    const d = cnDigitsOf(c.cnCode);
    return (/^\d+$/.test(qd) && (d.startsWith(qd) || qd.startsWith(d)))
      || c.description.toLowerCase().includes(q);
  });
}
