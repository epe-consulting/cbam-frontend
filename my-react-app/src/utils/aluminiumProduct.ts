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

/**
 * Production process of an aluminium good: CN 7601 (unwrought aluminium) or the aluminium products
 * (7603–7616). One calculation covers ONE production process (user decision 2026-11-22), so that one SEE
 * for all its goods is correct: IR (EU) 2025/2547 Annex III A, Eq. 57 (p. 71) attributes emissions per
 * production process. Null when the code is empty or not 4–8 digits.
 */
export type AluminiumProcess = 'UNWROUGHT' | 'PRODUCTS';

export function aluminiumProcessOf(cn: string | null | undefined): AluminiumProcess | null {
  const d = cnDigitsOf(cn);
  if (!/^\d{4,8}$/.test(d)) return null;
  return d.startsWith('7601') ? 'UNWROUGHT' : 'PRODUCTS';
}

/** True when the goods mix CN 7601 with other aluminium goods (two production processes). */
export function mixesAluminiumProcesses(cns: (string | null | undefined)[]): boolean {
  const kinds = new Set(cns.map(aluminiumProcessOf).filter((k): k is AluminiumProcess => k != null));
  return kinds.size > 1;
}

/**
 * Declaration choice (ALU_DECLARATION_PRODUCT: 'unwrought' = CN 7601, 'products' = aluminium products)
 * must match the goods entered in the product details. True when nothing contradicts it.
 */
export function declarationMatchesGoods(declaration: string, cns: (string | null | undefined)[]): boolean {
  const want: AluminiumProcess | null = declaration === 'unwrought' ? 'UNWROUGHT' : declaration === 'products' ? 'PRODUCTS' : null;
  if (want == null) return true;
  return cns.map(aluminiumProcessOf).every((k) => k == null || k === want);
}
