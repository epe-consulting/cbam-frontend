import { apiRequest } from '../utils/api';
import {
  deleteCalculationAnswersByCalculationAndQuestions,
  getCalculationAnswersByCalculation,
  upsertCalculationAnswer,
} from './calculationAnswers';
import { getAllQuestions } from './questions';
import { tr } from '../i18n';

/* Company installations maintained in Settings (used instead of re-entering them in the wizard). */

export interface CompanyInstallation {
  id: number;
  companyId: number;
  installationName: string;
  address: string;
  country: string;
  unLocode: string;
  cbamRegistryInstallationId: string;
}

/** Installations of the logged-in user's company (same endpoints as the Settings page). */
export async function getMyCompanyInstallations(): Promise<CompanyInstallation[]> {
  const me = await apiRequest<{ success: boolean; user?: { companyId: number | null } }>('/users/me');
  const companyId = me?.data?.success ? me.data.user?.companyId : null;
  if (!companyId) return [];
  const res = await apiRequest<{ success: boolean; installations?: CompanyInstallation[] }>(
    `/installations/company/${companyId}`
  );
  if (res === null || !res.data.success) throw new Error(tr('err.installations'));
  return res.data.installations ?? [];
}

/* Iron & steel reference-data endpoints (docs/steel-api-contract.md §3). */

export interface IsCnMappingRow {
  cnCode: string;
  cnDigits: string;
  category: string;
  categoryLabel: string;
  description: string;
  directOnly: boolean;
  ambiguous: boolean;
  precursorOnly: boolean;
  sortOrder: number;
}

export async function getIsCnMapping(): Promise<IsCnMappingRow[]> {
  const res = await apiRequest<{ success: boolean; rows?: IsCnMappingRow[]; message?: string }>('/is/cn-mapping');
  if (res === null || !res.data.success) throw new Error(res?.data?.message ?? tr('err.cnCodes'));
  return res.data.rows ?? [];
}

export interface IsCnValidation {
  ok: boolean;
  cnDigits?: string;
  matchedCnCode?: string;
  category?: string;
  directOnly?: boolean;
  ambiguous?: boolean;
  precursorOnly?: boolean;
  errorCode?: string;
  message?: string;
}

export async function validateIsCn(cn: string, allowShort = false): Promise<IsCnValidation> {
  const q = `cn=${encodeURIComponent(cn)}${allowShort ? '&allowShort=true' : ''}`;
  const res = await apiRequest<{
    success: boolean; cnDigits?: string; matchedCnCode?: string; category?: string;
    directOnly?: boolean; ambiguous?: boolean; precursorOnly?: boolean; errorCode?: string; message?: string;
  }>(`/is/cn-validate?${q}`);
  if (res === null) return { ok: false, errorCode: 'SESSION', message: tr('err.session') };
  const d = res.data;
  if (!d.success) return { ok: false, errorCode: d.errorCode, message: d.message };
  return {
    ok: true,
    cnDigits: d.cnDigits,
    matchedCnCode: d.matchedCnCode,
    category: d.category,
    directOnly: d.directOnly,
    ambiguous: d.ambiguous,
    precursorOnly: d.precursorOnly,
  };
}

export interface IsStandardFactor {
  code: string;
  wizardCode: string;
  category: 'FUEL' | 'CARBONATE' | 'OXIDE' | 'STEEL_MATERIAL' | 'GWP' | string;
  description: string;
  emissionFactor: number | null;
  unit: string | null;
  ncv: number | null;
  ncvUnit: string | null;
  carbonContent: number | null;
  source: string | null;
}

export async function getIsStandardFactors(): Promise<IsStandardFactor[]> {
  const res = await apiRequest<{ success: boolean; factors?: IsStandardFactor[]; message?: string }>('/is/standard-factors');
  if (res === null || !res.data.success) throw new Error(res?.data?.message ?? tr('err.factors'));
  return res.data.factors ?? [];
}

export interface IsGridEf {
  country: string;
  requestedCountry: string;
  efTPerMwh: number;
  fallbackUsed: boolean;
  source: string;
}

export async function getIsGridEf(country: string): Promise<IsGridEf | null> {
  const res = await apiRequest<{ success: boolean } & Partial<IsGridEf>>(`/is/grid-ef?country=${encodeURIComponent(country)}`);
  if (res === null || !res.data.success || res.data.efTPerMwh == null) return null;
  return {
    country: res.data.country ?? country,
    requestedCountry: res.data.requestedCountry ?? country,
    efTPerMwh: res.data.efTPerMwh,
    fallbackUsed: Boolean(res.data.fallbackUsed),
    source: res.data.source ?? '',
  };
}

export interface IsExemptOrigins {
  countries: string[];
  territories: string[];
}

export async function getIsExemptOrigins(): Promise<IsExemptOrigins> {
  const res = await apiRequest<{ success: boolean; countries?: string[]; territories?: string[]; message?: string }>('/is/exempt-origins');
  if (res === null || !res.data.success) throw new Error(res?.data?.message ?? tr('err.exempt'));
  return { countries: res.data.countries ?? [], territories: res.data.territories ?? [] };
}

/* ─── Answer persistence helpers for steel steps ─── */

/** Map question code -> question id (from GET /questions/all). */
export async function getQuestionIdsByCode(): Promise<Record<string, number>> {
  const list = await getAllQuestions();
  const map: Record<string, number> = {};
  list.forEach((q) => { map[q.code] = q.id; });
  return map;
}

/** All stored answer values grouped by question code (keeps every row of repeatable questions, in insert order). */
export async function getAnswerValuesByCode(
  calculationId: number,
  questionIdsByCode: Record<string, number>,
): Promise<Record<string, string[]>> {
  const idToCode: Record<number, string> = {};
  Object.entries(questionIdsByCode).forEach(([code, id]) => { idToCode[id] = code; });
  const answers = await getCalculationAnswersByCalculation(calculationId);
  const sorted = [...answers].sort((a, b) => a.id - b.id);
  const out: Record<string, string[]> = {};
  sorted.forEach((a) => {
    const qId = a.question?.id;
    const code = qId != null ? idToCode[qId] : undefined;
    if (!code || a.valueText == null) return;
    (out[code] ??= []).push(a.valueText);
  });
  return out;
}

/** Delete all answers of the question, then insert one answer per row (JSON object). */
export async function replaceRowAnswers(calculationId: number, questionId: number, rows: object[]): Promise<void> {
  await deleteCalculationAnswersByCalculationAndQuestions(calculationId, [questionId]);
  for (const row of rows) {
    await upsertCalculationAnswer({
      calculation: { id: calculationId },
      question: { id: questionId },
      valueText: JSON.stringify(row),
    });
  }
}

/** Delete the answer(s) of a single-value question, then store the new value (if not blank). */
export async function replaceValueAnswer(calculationId: number, questionId: number, value: string): Promise<void> {
  await deleteCalculationAnswersByCalculationAndQuestions(calculationId, [questionId]);
  if (value.trim() !== '') {
    await upsertCalculationAnswer({
      calculation: { id: calculationId },
      question: { id: questionId },
      valueText: value.trim(),
    });
  }
}
