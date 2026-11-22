// Aluminium flue gas treatment (wizard step 9): one or more carbonates in one production process.
// Process CO2 is calculated per carbonate consumed (IR (EU) 2025/2547 Annex II, point B.9.1.1,
// Method A) and the source streams are added together (Guidance 05e, p. 19). The carbonates and
// their factors are those of IR (EU) 2025/2547 Annex II, Section G, Table 3 (p. 63); the factors
// live in the backend formulas (post-024 for soda ash / limestone, post-045 for the others).

export const FLUE_GAS_TREATMENT_Q = 'ALU_FLUE_GAS_TREATMENT';
export const FLUE_GAS_SODA_ASH_QTY_Q = 'ALU_FLUE_GAS_SODA_ASH_QTY';
export const FLUE_GAS_LIMESTONE_QTY_Q = 'ALU_FLUE_GAS_LIMESTONE_QTY';

/** Carbonates of Table 3, in the order shown in the wizard, with their quantity question. */
export const FLUE_GAS_CARBONATES = [
  { key: 'SODA_ASH', qtyQuestion: FLUE_GAS_SODA_ASH_QTY_Q },
  { key: 'LIMESTONE', qtyQuestion: FLUE_GAS_LIMESTONE_QTY_Q },
  { key: 'MGCO3', qtyQuestion: 'ALU_FLUE_GAS_MGCO3_QTY' },
  { key: 'BACO3', qtyQuestion: 'ALU_FLUE_GAS_BACO3_QTY' },
  { key: 'LI2CO3', qtyQuestion: 'ALU_FLUE_GAS_LI2CO3_QTY' },
  { key: 'K2CO3', qtyQuestion: 'ALU_FLUE_GAS_K2CO3_QTY' },
  { key: 'SRCO3', qtyQuestion: 'ALU_FLUE_GAS_SRCO3_QTY' },
  { key: 'NAHCO3', qtyQuestion: 'ALU_FLUE_GAS_NAHCO3_QTY' },
  { key: 'FECO3', qtyQuestion: 'ALU_FLUE_GAS_FECO3_QTY' },
] as const;

export type CarbonateKey = (typeof FLUE_GAS_CARBONATES)[number]['key'];

/** Quantity typed per carbonate (missing = not answered). */
export type FlueGasQuantities = Partial<Record<CarbonateKey, string>>;

export interface FlueGasSelection {
  ticked: CarbonateKey[];
  nothing: boolean;
}

const hasText = (v: string | undefined) => String(v ?? '').trim() !== '';

/**
 * Ticked carbonates from the stored option code (also the older frontend values 'soda-ash' /
 * 'limestone' / 'nothing') and from the quantities that have a value. 'CARBONATES' (post-045)
 * means "several carbonates": which ones is read from the quantities.
 */
export function flueGasSelection(code: string, quantities: FlueGasQuantities = {}): FlueGasSelection {
  const c = (code ?? '').trim().toUpperCase().replace(/-/g, '_');
  if (c === 'NOTHING') return { ticked: [], nothing: true };
  if (c === 'CARBONATES') {
    return { ticked: FLUE_GAS_CARBONATES.map((x) => x.key).filter((k) => hasText(quantities[k])), nothing: false };
  }
  // Older codes: exactly as before post-045 (soda ash / limestone from the code only).
  const ticked: CarbonateKey[] = [];
  if (c === 'SODA_ASH' || c === 'SODA_ASH_AND_LIMESTONE') ticked.push('SODA_ASH');
  if (c === 'LIMESTONE' || c === 'SODA_ASH_AND_LIMESTONE') ticked.push('LIMESTONE');
  return { ticked, nothing: false };
}

/** Option code saved on ALU_FLUE_GAS_TREATMENT for the ticked boxes ('' when nothing is ticked yet). */
export function flueGasCode(s: FlueGasSelection): string {
  if (s.nothing) return 'NOTHING';
  const t = new Set(s.ticked);
  if (t.size === 0) return '';
  if (t.size === 1 && t.has('SODA_ASH')) return 'SODA_ASH';
  if (t.size === 1 && t.has('LIMESTONE')) return 'LIMESTONE';
  if (t.size === 2 && t.has('SODA_ASH') && t.has('LIMESTONE')) return 'SODA_ASH_AND_LIMESTONE';
  return 'CARBONATES';
}

export function isPositiveQuantity(v: string): boolean {
  const n = Number(String(v ?? '').trim().replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(n) && n > 0;
}

/** True when a choice is made and every ticked carbonate has a quantity above zero. */
export function flueGasComplete(s: FlueGasSelection, quantities: FlueGasQuantities): boolean {
  if (s.nothing) return true;
  if (s.ticked.length === 0) return false;
  return s.ticked.every((k) => isPositiveQuantity(quantities[k] ?? ''));
}
