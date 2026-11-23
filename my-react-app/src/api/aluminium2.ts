import { apiRequest } from '../utils/api';
import { tr } from '../i18n';
import type { Al2CnMapping, Al2CnMappingRow, Al2PfcFactorRow } from '../utils/aluminium2Steps';

/*
 * Aluminium II reference-data endpoints (base path /al2), docs/aluminium2-api-contract.md §3 (v1.1; wins over the
 * spec's §5.2 draft). Errors come back as HTTP 200 with success:false (as /is, /ce).
 * Reused unchanged from api/ironSteel.ts: getIsStandardFactors (FUEL, CARBONATE, GWP), getIsExemptOrigins,
 * replaceRowAnswers, replaceValueAnswer, getAnswerValuesByCode, getMyCompanyInstallations.
 */

/** GET /al2/cn-mapping → 14 headings with 8-digit suggestions + excluded headings (contract §3). */
export async function getAl2CnMapping(): Promise<Al2CnMapping> {
  const res = await apiRequest<{ success: boolean; rows?: Al2CnMappingRow[]; excluded?: string[]; message?: string }>('/al2/cn-mapping');
  if (res === null || !res.data.success) throw new Error(res?.data?.message ?? tr('err.cnCodes'));
  return {
    rows: (res.data.rows ?? []).map((r) => ({ ...r, suggestions: r.suggestions ?? [] })),
    excluded: res.data.excluded ?? [],
  };
}

export interface Al2CnValidation {
  ok: boolean;
  cnDigits?: string;
  cnCode?: string;
  heading?: string;
  category?: string;
  complex?: boolean;
  inSuggestionList?: boolean;
  errorCode?: string;
  message?: string;
}

/** GET /al2/cn-validate?cn= (errors AL2_E_CN_FORMAT | AL2_E_CN_EXCLUDED | AL2_E_CN_NOT_CBAM_ALUMINIUM). */
export async function validateAl2Cn(cn: string): Promise<Al2CnValidation> {
  const res = await apiRequest<{ success: boolean } & Omit<Al2CnValidation, 'ok'>>(`/al2/cn-validate?cn=${encodeURIComponent(cn)}`);
  if (res === null) return { ok: false, errorCode: 'SESSION', message: tr('err.session') };
  const { success, ...rest } = res.data;
  return { ok: Boolean(success), ...rest };
}

export interface Al2DefaultValue {
  annex: 'I' | 'IV' | string;
  requestedCode: string;
  matchedCode: string;
  requestedCountry: string | null;
  country: string;
  fallbackUsed: boolean;
  year: number;
  total: number | null;
  markupPct: number | null;
  /** total × (1 + m), computed by the backend (contract §3; spec §2.3.3). */
  valueForYear: number | null;
  bmRoute: string | null;
  dvcCorrection: boolean;
  source: string;
}

export interface Al2DefaultValueResult {
  ok: boolean;
  value?: Al2DefaultValue;
  warnings: { code: string; severity?: string; context?: Record<string, unknown> }[];
  errorCode?: string;
  message?: string;
}

/** GET /al2/default-value?cn=&country=&year=&annex=I|IV (CN 8 digits; country ignored for Annex IV). */
export async function getAl2DefaultValue(cn: string, country: string, year: number, annex: 'I' | 'IV' = 'I'): Promise<Al2DefaultValueResult> {
  const q = `cn=${encodeURIComponent(cn)}${annex === 'I' ? `&country=${encodeURIComponent(country)}` : ''}&year=${year}&annex=${annex}`;
  const res = await apiRequest<{
    success: boolean; value?: Al2DefaultValue; warnings?: Al2DefaultValueResult['warnings']; errorCode?: string; message?: string;
  }>(`/al2/default-value?${q}`);
  if (res === null) return { ok: false, warnings: [], errorCode: 'SESSION', message: tr('err.session') };
  const d = res.data;
  if (!d.success || !d.value) return { ok: false, warnings: d.warnings ?? [], errorCode: d.errorCode, message: d.message };
  return { ok: true, value: d.value, warnings: d.warnings ?? [] };
}

/** GET /al2/pfc-factors → MA Annex II B.7 Table 2 / Table 3 constants with source strings (contract §3). */
export async function getAl2PfcFactors(): Promise<Al2PfcFactorRow[]> {
  const res = await apiRequest<{ success: boolean; rows?: Al2PfcFactorRow[]; message?: string }>('/al2/pfc-factors');
  if (res === null || !res.data.success) throw new Error(res?.data?.message ?? tr('err.factors'));
  return res.data.rows ?? [];
}
