// Aluminium flue gas treatment (wizard step 9): soda ash and/or limestone in one production process.
// Both carbonates may be used together: process CO2 is calculated per carbonate consumed
// (IR (EU) 2025/2547 Annex II, point B.9.1.1, Method A) and the source streams are added
// together (Guidance 05e, p. 19). The emission factors live in the backend formulas (post-024).

export const FLUE_GAS_TREATMENT_Q = 'ALU_FLUE_GAS_TREATMENT';
export const FLUE_GAS_SODA_ASH_QTY_Q = 'ALU_FLUE_GAS_SODA_ASH_QTY';
export const FLUE_GAS_LIMESTONE_QTY_Q = 'ALU_FLUE_GAS_LIMESTONE_QTY';

export interface FlueGasSelection {
  sodaAsh: boolean;
  limestone: boolean;
  nothing: boolean;
}

/** Reads the stored option code (also the older frontend values 'soda-ash' / 'limestone' / 'nothing'). */
export function flueGasSelection(code: string): FlueGasSelection {
  const c = (code ?? '').trim().toUpperCase().replace(/-/g, '_');
  return {
    sodaAsh: c === 'SODA_ASH' || c === 'SODA_ASH_AND_LIMESTONE',
    limestone: c === 'LIMESTONE' || c === 'SODA_ASH_AND_LIMESTONE',
    nothing: c === 'NOTHING',
  };
}

/** Option code saved on ALU_FLUE_GAS_TREATMENT for the ticked boxes ('' when nothing is ticked yet). */
export function flueGasCode(s: FlueGasSelection): string {
  if (s.nothing) return 'NOTHING';
  if (s.sodaAsh && s.limestone) return 'SODA_ASH_AND_LIMESTONE';
  if (s.sodaAsh) return 'SODA_ASH';
  if (s.limestone) return 'LIMESTONE';
  return '';
}

export function isPositiveQuantity(v: string): boolean {
  const n = Number(String(v ?? '').trim().replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(n) && n > 0;
}

/** True when a choice is made and every ticked carbonate has a quantity above zero. */
export function flueGasComplete(s: FlueGasSelection, sodaQty: string, limestoneQty: string): boolean {
  if (s.nothing) return true;
  if (!s.sodaAsh && !s.limestone) return false;
  return (!s.sodaAsh || isPositiveQuantity(sodaQty)) && (!s.limestone || isPositiveQuantity(limestoneQty));
}
