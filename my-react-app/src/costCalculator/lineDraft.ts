// Form-state helpers for import lines (kept apart from the editor component for fast refresh).

import { suggestDefaultPathwaySefa } from './engine.ts';
import type { ActualDataSource, DeductionClaim, ImportLine } from './types.ts';

/** Form state for one line; numbers are kept as strings while editing. */
export interface LineDraft {
  id: string;
  cn: string;
  variant: string;
  country: string;
  importYear: number;
  importQuarter: 1 | 2 | 3 | 4;
  quantity: string;
  unit: 't' | 'kg';
  actualSee: string;
  actualSefa: string;
  sefaManual: boolean;
  actualSource: ActualDataSource;
  /** Carbon price paid in the country of origin (Reg. (EU) 2023/956 Art. 9). */
  carbonPrice: DeductionClaim['kind'];
  /** Production year for actual data, only with sufficient evidence (IR 2025/2547 Art. 7(1)). */
  productionYear: string;
  productionYearEvidence: boolean;
}

export function newLineDraft(partial: Partial<LineDraft> = {}): LineDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cn: '',
    variant: '',
    country: '',
    importYear: 2026,
    importQuarter: 1,
    quantity: '',
    unit: 't',
    actualSee: '',
    actualSefa: '',
    sefaManual: false,
    actualSource: 'PRELIMINARY_ESTIMATE',
    carbonPrice: 'NONE_ASSUMED',
    productionYear: '',
    productionYearEvidence: false,
    ...partial,
  };
}

/** SEFA used for the line: manual entry, otherwise the default-path planning proxy. */
export function effectiveSefa(d: LineDraft): string {
  if (d.sefaManual) return d.actualSefa;
  const s = suggestDefaultPathwaySefa(d.country, d.cn, d.importYear, d.variant || undefined);
  return s.ok ? String(Number(s.sefa.toFixed(6))) : '';
}

export function draftToLine(d: LineDraft): ImportLine {
  const see = d.actualSee.trim();
  const sefa = effectiveSefa(d).trim();
  return {
    id: d.id,
    cn: d.cn,
    variant: d.variant || undefined,
    countryOfOrigin: d.country,
    importYear: d.importYear,
    importQuarter: d.importQuarter,
    quantity: Number(d.quantity),
    unit: d.unit,
    actualSee: see === '' ? undefined : Number(see),
    actualSefa: see === '' || sefa === '' ? undefined : Number(sefa),
    // A prefilled default-path SEFA is a planning proxy, never verified supplier data.
    actualSource: see === '' ? undefined : d.sefaManual ? d.actualSource : 'PRELIMINARY_ESTIMATE',
    productionYear: d.productionYear ? Number(d.productionYear) : undefined,
    productionYearEvidence: d.productionYearEvidence && d.productionYear !== '',
    // Same claim in both pathways; the engine applies the pathway rules (Art. 9(1) vs 9(4)).
    defaultDeduction: { kind: d.carbonPrice },
    actualDeduction: { kind: d.carbonPrice },
  };
}

/** Returns an error message for an incomplete line, or null. */
export function validateDraft(d: LineDraft, index: number): string | null {
  const q = Number(d.quantity);
  if (!d.cn || !d.country || !Number.isFinite(q) || q <= 0) {
    return `Line ${index + 1}: enter a CN code, country of origin and a positive quantity.`;
  }
  if (d.actualSee.trim() !== '' && effectiveSefa(d).trim() === '') {
    return `Line ${index + 1}: enter the supplier's SEFA for the actual-emissions scenario, or clear actual SEE.`;
  }
  return null;
}
