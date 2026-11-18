import { apiRequest } from '../utils/api';
import { tr } from '../i18n';
import type { CeCnMappingRow } from '../utils/cementSteps';

/*
 * Cement reference-data endpoints (base path /ce), docs/cement-api-contract.md §3 (v0.1 draft; wins over the
 * spec's §5.2 draft). Errors come back as HTTP 200 with success:false (as /is).
 * Reused unchanged from api/ironSteel.ts: getIsStandardFactors, getIsGridEf, getIsExemptOrigins, replaceRowAnswers,
 * getAnswerValuesByCode, getMyCompanyInstallations.
 */

export async function getCeCnMapping(): Promise<CeCnMappingRow[]> {
  const res = await apiRequest<{ success: boolean; rows?: CeCnMappingRow[]; message?: string }>('/ce/cn-mapping');
  if (res === null || !res.data.success) throw new Error(res?.data?.message ?? tr('err.cnCodes'));
  return (res.data.rows ?? []).map((r) => ({ ...r, taricOptions: r.taricOptions ?? [] }));
}

export interface CeCnValidation {
  ok: boolean;
  cnDigits?: string;
  taricDigits?: string;
  /** Lookup key: TARIC digits if required, else CN digits (contract §3.2). */
  key?: string;
  category?: string;
  functionalUnit?: string;
  white?: boolean | null;
  complex?: boolean;
  errorCode?: string;
  message?: string;
}

export async function validateCeCn(cn: string, taric: string): Promise<CeCnValidation> {
  const q = `cn=${encodeURIComponent(cn)}${taric ? `&taric=${encodeURIComponent(taric)}` : ''}`;
  const res = await apiRequest<{ success: boolean } & Omit<CeCnValidation, 'ok'>>(`/ce/cn-validate?${q}`);
  if (res === null) return { ok: false, errorCode: 'SESSION', message: tr('err.session') };
  const { success, ...rest } = res.data;
  return { ok: Boolean(success), ...rest };
}

export interface CeDefaultValue {
  requestedCode: string;
  matchedCode: string;
  requestedCountry: string;
  country: string;
  fallbackUsed: boolean;
  year: number;
  direct: number | null;
  indirect: number | null;
  total: number | null;
  valueForYear: number | null;
  markupPct: number | null;
  bmRoute: string | null;
  source: string;
  /** Display split of spec §3.2 step 5 (contract §3.3; OPEN QUESTION OQ-CE-7). */
  seeDirectDisplay?: number | null;
  seeIndirectDisplay?: number | null;
}

export interface CeDefaultValueResult {
  ok: boolean;
  value?: CeDefaultValue;
  warnings: { code: string; message?: string; message_bs?: string }[];
  errorCode?: string;
  message?: string;
}

/** GET /ce/default-value?code=&country=&year=&annex=I|IV (code = TARIC digits when required, else CN). */
export async function getCeDefaultValue(code: string, country: string, year: number, annex: 'I' | 'IV' = 'I'): Promise<CeDefaultValueResult> {
  const q = `code=${encodeURIComponent(code)}&country=${encodeURIComponent(country)}&year=${year}&annex=${annex}`;
  const res = await apiRequest<{
    success: boolean; value?: CeDefaultValue; warnings?: CeDefaultValueResult['warnings']; errorCode?: string; message?: string;
  }>(`/ce/default-value?${q}`);
  if (res === null) return { ok: false, warnings: [], errorCode: 'SESSION', message: tr('err.session') };
  const d = res.data;
  if (!d.success || !d.value) return { ok: false, warnings: d.warnings ?? [], errorCode: d.errorCode, message: d.message };
  return { ok: true, value: d.value, warnings: d.warnings ?? [] };
}
